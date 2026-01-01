import { GoogleGenerativeAI, SchemaType, FunctionDeclaration, FunctionCallingMode } from '@google/generative-ai';

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
                description: "Brief chat message (1-2 sentences max).",
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
            }
        },
        required: ["comment", "operations"]
    }
};

const SYSTEM_PROMPT = `You are "Board AI", a professional tutor.

CRITICAL:
- You MUST respond by calling the function "generate_response".
- Do NOT output normal chat text.
- Your final output MUST be a single function call.

LANGUAGE RULE (VERY IMPORTANT):
- You MUST respond in the SAME language as the user's last message.
- This applies to:
  - comment
  - node.content
- If the user writes in Japanese, respond in Japanese.
- If the user writes in English, respond in English.
- Do NOT mix languages.

Task:
- Create a whiteboard explanation that helps the user:
  1) understand what the topic is
  2) know when it should or should not be used
- Prioritize clarity over completeness.

Guiding principles (internal checklist, NOT strict sections):
- One-line core meaning (What)
- Purpose or role (Why / Do)
- Rough input/output image if helpful
- Scope or limits (when it applies / does not apply)
- One common confusion to prevent misunderstanding

Whiteboard output rules:
- operations MUST include exactly ONE "create" operation.
- node.type must be "text".
- node.content should be concise Markdown.
- Use short headings ONLY if they improve readability.
- Do NOT force fixed section names or counts.

Content restrictions:
- Concept-level only.
- No commands, APIs, flags, code, or step-by-step instructions.
- No exhaustive lists.
- This is NOT documentation and NOT a tutorial.

Function output:
- comment: 1–2 short friendly sentences, SAME language as user.
- operations: the single whiteboard text node.

Remember:
- WDIBC is only a mental checklist.
- Language matching is mandatory.
- Call "generate_response" now.`;



export async function POST(req: Request) {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        return new Response('API Key missing', { status: 500 });
    }

    try {
        const { messages } = await req.json();

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: SYSTEM_PROMPT,
            tools: [{ functionDeclarations: [GENERATE_RESPONSE_TOOL] }],
            toolConfig: {
                functionCallingConfig: {
                    mode: FunctionCallingMode.ANY,
                    allowedFunctionNames: ["generate_response"]
                }
            }
        });

        interface LocalMessage {
            role: string;
            parts?: Array<{ text?: string }>;
            content?: string;
        }

        const history = messages.slice(0, -1).map((m: LocalMessage) => ({
            role: m.role === 'user' ? 'user' as const : 'model' as const,
            parts: m.parts || [{ text: m.content || '' }]
        }));

        const lastMessage = messages[messages.length - 1];
        const userMessageContent = lastMessage.parts || lastMessage.content;

        const chat = model.startChat({ history });
        const result = await chat.sendMessageStream(userMessageContent);

        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                try {
                    for await (const chunk of result.stream) {
                        const functionCalls = chunk.functionCalls();
                        if (functionCalls?.length) {
                            for (const call of functionCalls) {
                                if (call.name === 'generate_response') {
                                    // Add framework-specific suggested questions
                                    const args = {
                                        ...call.args,
                                        suggestedQuestions: [
                                            "具体的な例を見せて",
                                            "関連する概念は何がある？",
                                            "これを実際に使う手順を教えて"
                                        ]
                                    };
                                    controller.enqueue(encoder.encode(JSON.stringify({
                                        type: 'tool_call',
                                        toolName: 'generate_response',
                                        args: args
                                    }) + '\n'));
                                }
                            }
                        }
                        const text = chunk.text();
                        if (text) {
                            controller.enqueue(encoder.encode(JSON.stringify({
                                type: 'text',
                                content: text
                            }) + '\n'));
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
            headers: { 'Content-Type': 'application/x-ndjson', 'Transfer-Encoding': 'chunked' }
        });

    } catch (error) {
        console.error('Concept Framework Error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}
