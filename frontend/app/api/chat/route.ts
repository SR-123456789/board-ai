import { GoogleGenerativeAI, SchemaType, FunctionDeclaration, FunctionCallingMode } from '@google/generative-ai';

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
        const { messages } = await req.json();

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: `You are "Board AI", a professional tutor who teaches by using a vertical notebook/whiteboard.
# Core Behaviors
1. **Board First**: Your primary teaching method is the whiteboard. MAXIMIZE board usage ("generate_response.operations").
   - **CRITICAL**: Do NOT repeat content in the chat ("generate_response.comment") that is already on the board. The chat is ONLY for brief, polite introductions or very short summaries (1-2 sentences max).
2. **Semantic Grouping**: Create meaningful, self-contained nodes. Avoid creating many small, fragmented nodes.
   - Example: Instead of 3 separate text nodes for "Definition", "Formula", and "Example", combine them into ONE "text" or "sticky" node with Markdown headers.
3. **Markdown**: Always use **Markdown** syntax in "operations.node.content". Use headers (#, ##), lists, and bold text to structure the content within a node.
   - Example: "# Title\n\n## Subtitle\n\n- Point 1\n- Point 2"
4. **Flow**: Create nodes in a logical order. They will be displayed as a vertical list from top to bottom.
5. **Interactive**: Use the chat mainly for brief questions or confirmation.
6. **Language**: Always respond in the same language as the user's input. If the user speaks Japanese, you MUST respond in Japanese.
7. 何かしらのフレームワークを用いて解説してください
8. **Suggested Questions**: Always provide 2-3 follow-up questions (suggestedQuestions) that:
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

        // Convert messages to Google SDK format
        // history expects { role: 'user' | 'model', parts: [...] }
        const history = messages.slice(0, -1).map((m: any) => {
            // Check if client already sent 'parts' (new format)
            if (m.parts) {
                return {
                    role: m.role === 'user' ? 'user' : 'model',
                    parts: m.parts
                };
            }
            // Fallback for old format or simple text
            return {
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content || '' }]
            };
        });

        const lastMessage = messages[messages.length - 1];
        // The client now sends the last message with 'parts' if it has images
        // We need to pass the parts to sendMessageStream if available, or just text

        const chat = model.startChat({
            history: history,
        });

        // If lastMessage has parts (multimodal), use that. Otherwise use content.
        const userMessageContent = lastMessage.parts ? lastMessage.parts : lastMessage.content;

        console.log("--- Sending to Gemini ---");
        console.log("User Message Content Structure:", JSON.stringify(userMessageContent, (key, value) => {
            if (key === 'data') return '[BASE64_DATA_TRUNCATED]';
            return value;
        }, 2));

        const result = await chat.sendMessageStream(userMessageContent);

        // Create a streaming response
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                try {
                    for await (const chunk of result.stream) {
                        // Check for function calls
                        const functionCalls = chunk.functionCalls();
                        if (functionCalls && functionCalls.length > 0) {
                            for (const call of functionCalls) {
                                if (call.name === 'generate_response') {
                                    const args = call.args;
                                    const data = JSON.stringify({
                                        type: 'tool_call',
                                        toolName: 'generate_response',
                                        args: args
                                    });
                                    controller.enqueue(encoder.encode(data + '\n'));
                                }
                            }
                        }

                        // Check for text (should be empty if tool is forced, but usually model explains reasoning if not forced)
                        const text = chunk.text();
                        if (text) {
                            const data = JSON.stringify({
                                type: 'text',
                                content: text
                            });
                            controller.enqueue(encoder.encode(data + '\n'));
                        }
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
