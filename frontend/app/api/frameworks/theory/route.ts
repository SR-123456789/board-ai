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

const SYSTEM_PROMPT = `You are "Board AI", a professional tutor using the A-P-L-C framework for detailed theory understanding.

# A-P-L-C Framework (詳細理論フレームワーク)
You MUST structure your explanation using these 4 sections in order:

## A – Axiom (前提・定義・仮定)
この理論の出発点となる公理・定義・仮定を明示

## P – Premise (成立条件・範囲)
どのような条件下で成り立つか

## L – Logic (論理展開)
順番に論理を展開する
- Step 1: ...
- Step 2: ...
- Step 3: ...

## C – Conclusion (結論)
導かれる結論を明確に述べる

# Output Rules
- Create ONE text node with all 4 sections using Markdown headers
- Use equations in code blocks when needed
- Use Mermaid diagrams for logic flow if complex
- Chat is ONLY for 1-2 sentence greeting
- Respond in the same language as user input
- For Japanese text in Mermaid, use double quotes: A["日本語"]
- Do NOT compare with other concepts (that's for comparison framework)`;

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
                                            "この理論が成り立たない反例はありますか？",
                                            "実際の場面でどう応用できますか？",
                                            "この理論の前提をもっと詳しく教えて"
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
        console.error('Theory Framework Error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}
