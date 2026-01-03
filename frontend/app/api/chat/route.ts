import { GoogleGenerativeAI, SchemaType, FunctionDeclaration, FunctionCallingMode } from '@google/generative-ai';
import { createClient } from '@/utils/supabase/server';
import { UserService } from '@/lib/services/userService';
import { ChatService } from '@/lib/services/chatService';
import { RoomService } from '@/lib/services/roomService';
import prisma from '@/lib/prisma';
import type { GeminiHistoryMessage, ApiMessagePart } from '@/types/api';

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

const GENERATE_RESPONSE_TOOL: FunctionDeclaration = {
    name: "generate_response",
    description: "Generate a response with text comment and board updates.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            comment: {
                type: SchemaType.STRING,
                description: "The explanation or text to show in the chat.",
            },
            operations: {
                type: SchemaType.ARRAY,
                description: "List of operations to perform on the whiteboard.",
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        action: { type: SchemaType.STRING, enum: ["create", "update", "delete"], format: "enum" },
                        node: {
                            type: SchemaType.OBJECT,
                            properties: {
                                id: { type: SchemaType.STRING },
                                type: { type: SchemaType.STRING, enum: ["text", "sticky", "equation", "problem"], format: "enum" },
                                content: { type: SchemaType.STRING },
                                style: {
                                    type: SchemaType.OBJECT,
                                    properties: {
                                        color: { type: SchemaType.STRING },
                                        backgroundColor: { type: SchemaType.STRING }
                                    }
                                }
                            },
                            required: ["type", "content"]
                        }
                    },
                    required: ["action", "node"]
                }
            },
            suggestedQuestions: {
                type: SchemaType.ARRAY,
                description: "2-3 follow-up questions the user might want to ask next based on the current topic.",
                items: { type: SchemaType.STRING }
            }
        },
        required: ["comment", "operations", "suggestedQuestions"]
    }
};

export async function POST(req: Request) {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        return new Response('API Key missing', { status: 500 });
    }

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const userId = user?.id;
        if (!userId) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const { messages, roomId } = await req.json();

        // 1. Check if Room Exists; if not, create it (Guest Mode -> First Message)
        if (roomId) {
            const existingRoom = await RoomService.getRoom(roomId, userId);
            if (!existingRoom) {
                // Double check if room exists but owned by someone else?
                // getRoom filters by userId.
                // Let's rely on Prisma create failing if ID exists.
                // Or better, try checking only by ID to avoid claiming someone else's room.
                // Actually getRoom does strict check.
                // If it doesn't exist for USER, it might be new.
                // Let's try to create.
                try {
                    await RoomService.createRoom(userId, 'Untitled Room', roomId);
                } catch (e) {
                    // Ignore if already exists (race condition or re-login)
                    console.log("Room might already exist or error creating", e);
                }
            }
        }

        // 2. Check Token Limits
        const { allowed, error } = await UserService.canConsumeTokens(userId, 100);
        if (!allowed) {
            return new Response(JSON.stringify({ error }), { status: 403 });
        }

        // 3. Persist User Message
        const lastMessage = messages[messages.length - 1];
        if (roomId && userId) {
            // Extract text content from parts if content is empty
            let messageContent = lastMessage.content || '';
            if (!messageContent && lastMessage.parts) {
                const textPart = lastMessage.parts.find((p: { text?: string }) => p.text);
                messageContent = textPart?.text || '[ファイル添付]';
            }

            await ChatService.addMessage(roomId, userId, {
                id: lastMessage.id || crypto.randomUUID(),
                role: 'user',
                content: messageContent,
                parts: lastMessage.parts
            });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: `You are "Board AI", a professional tutor who teaches by using a vertical notebook/whiteboard.
# Core Behaviors
1. **Board First**: Your primary teaching method is the whiteboard. MAXIMIZE board usage ("generate_response.operations").
   - **CRITICAL**: The chat comment ("generate_response.comment") must be ONE LINE ONLY. Format: "[理由] → [結論]" or "[一言の要約]". NO long explanations in chat.
2. **Semantic Grouping**: Create meaningful, self-contained nodes. Avoid creating many small, fragmented nodes.
   - Example: Instead of 3 separate text nodes for "Definition", "Formula", and "Example", combine them into ONE "text" or "sticky" node with Markdown headers.
3. **Markdown**: Always use **Markdown** syntax in "operations.node.content". Use headers (#, ##), lists, and bold text to structure the content within a node.
   - Example: "# Title\n\n## Subtitle\n\n- Point 1\n- Point 2"
4. **Visual Diagrams**: Use code blocks for diagrams when it helps understanding.
   - **Mermaid**: Use \`\`\`mermaid\`\`\` for flowcharts, sequence diagrams, and gantt charts.
   - **D2**: Use \`\`\`d2\`\`\` for complex layouts, architectural diagrams, and network topologies. Prefer D2 for visual clarity in nested structures.
5. **Flow**: Create nodes in a logical order. They will be displayed as a vertical list from top to bottom.
6. **Interactive**: Use the chat mainly for brief questions or confirmation.
7. **Language**: Always respond in the same language as the user's input. If the user speaks Japanese, you MUST respond in Japanese.
8. 何かしらのフレームワークを用いて解説してください
9. **Suggested Questions**: Always provide 2-3 follow-up questions (suggestedQuestions) that:
   - Help the user dive deeper into the current topic
   - Explore related concepts or applications
   - Clarify or reinforce understanding
   - Must be in the same language as the user's input

# Tools
You MUST use the \`generate_response\` tool for every turn to provide your answer.
This tool puts text in the chat and updates the board.

# Board Operations
- Use 'create' to add new nodes (text, sticky notes, equation, problem).
- Use 'update' to modify existing nodes.
- Use 'delete' to remove nodes.
- **NO COORDINATES**: Do not try to position nodes. Just create them, and the frontend will stack them vertically.

# D2 MINIMAL SYNTAX RULES (STRICT)
- Syntax: ID: "Label" (IDs: A-Z, a-z, 0-9, _)
- Connections: A -> B, A -> B: "label"
- Shapes: A.shape: rectangle (cylinder, person, hexagon, box)
- Styles: A.style.fill: "#aabbcc" (ONLY fill color, NO style blocks)
- Edges: Dashed line only with "A -> B { stroke-dash: 4 }"
- Layout: "direction: right" or "direction: down"
- DO NOT use: nested style objects, stroke customization, custom arrowheads, or dotted IDs (e.g., B.foo).

# IMPORTANT: Output Requirements
- You MUST provided an 'operations' array with at least one action if you are teaching something.
- DO NOT output empty objects {}.
- NEVER duplicate content between the chat comment and the board operations.`,
            tools: [
                {
                    functionDeclarations: [GENERATE_RESPONSE_TOOL],
                },
            ],
            toolConfig: {
                functionCallingConfig: {
                    mode: FunctionCallingMode.ANY,
                    allowedFunctionNames: ["generate_response"]
                }
            }
        });

        interface LocalMessage {
            role: string;
            parts?: ApiMessagePart[];
            content?: string;
        }

        const history: GeminiHistoryMessage[] = messages.slice(0, -1).map((m: LocalMessage) => {
            const role = m.role === 'user' ? 'user' : 'model' as const;

            // If parts exist, filter to only valid Google AI SDK parts (text, fileData)
            if (m.parts && Array.isArray(m.parts)) {
                const validParts = m.parts
                    .filter((p: ApiMessagePart) => p.text !== undefined || p.fileData !== undefined)
                    .map((p: ApiMessagePart) => {
                        if (p.text !== undefined) return { text: p.text };
                        if (p.fileData) return { fileData: p.fileData };
                        return null;
                    })
                    .filter((p): p is { text: string } | { fileData: { fileUri: string; mimeType: string } } => p !== null);

                // If no valid parts remain, use content as text
                if (validParts.length === 0) {
                    return {
                        role,
                        parts: [{ text: m.content || '' }]
                    };
                }

                return { role, parts: validParts };
            }

            // Fallback to content
            return {
                role,
                parts: [{ text: m.content || '' }]
            };
        });

        const userMessageContent = lastMessage.parts ? lastMessage.parts : lastMessage.content;

        const chat = model.startChat({
            history: history,
        });

        const result = await chat.sendMessageStream(userMessageContent);

        // Usage Tracking Accumulator
        let promptedTokenCount = (await chat.getHistory()).reduce((acc, m) => acc + (m.parts[0].text?.length || 0), 0) / 4;

        // Create a streaming response
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                let fullResponseText = "";
                let toolCallData: { comment?: string; [key: string]: unknown } | null = null;

                try {
                    for await (const chunk of result.stream) {
                        const functionCalls = chunk.functionCalls();
                        if (functionCalls && functionCalls.length > 0) {
                            for (const call of functionCalls) {
                                if (call.name === 'generate_response') {
                                    const args = call.args as { comment?: string; [key: string]: unknown };
                                    toolCallData = args;

                                    const data = JSON.stringify({
                                        type: 'tool_call',
                                        toolName: 'generate_response',
                                        args: args
                                    });
                                    controller.enqueue(encoder.encode(data + '\n'));
                                }
                            }
                        }

                        const text = chunk.text();
                        if (text) {
                            fullResponseText += text;
                            const data = JSON.stringify({
                                type: 'text',
                                content: text
                            });
                            controller.enqueue(encoder.encode(data + '\n'));
                        }
                    }

                    if (roomId && userId) {
                        const contentToSave = toolCallData?.comment ?? fullResponseText;
                        const partsToSave = toolCallData ? [{ text: contentToSave }, { tool_use: toolCallData }] : undefined;

                        await ChatService.addMessage(roomId, userId, {
                            id: crypto.randomUUID(),
                            role: 'assistant',
                            content: contentToSave || '',
                            parts: partsToSave
                        });

                        const outputTokens = (fullResponseText.length + JSON.stringify(toolCallData || {}).length) / 4;
                        await UserService.consumTokens(userId, Math.ceil(promptedTokenCount + outputTokens));
                    }

                    controller.close();
                } catch (err) {
                    console.error('Streaming error:', err);
                    controller.error(err);
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'application/x-ndjson',
                'Transfer-Encoding': 'chunked',
            },
        });

    } catch (error) {
        console.error('Route Handler Error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error', details: String(error) }), { status: 500 });
    }
}
