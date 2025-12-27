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

const SYSTEM_PROMPT = `You are "Board AI", a professional tutor using the O-A-T-D framework for comparisons.

# O-A-T-D Framework (比較フレームワーク)
Use this framework when comparing options. Apply these 4 steps:

## O – Objective (目的)
- まず「何を決めたいか」を固定
- 目的がない比較はやらない

## A – Axis (比較軸)
- 判断に必要な軸だけ出す
- 2〜4軸まで
- 全対象共通

## T – Table (並列化)
- 同じ軸で横並び
- 1セル1語
- 空欄OK
- 評価はしない

## D – Decision (結論)
- 一言で判断指針を出す
- 「〇〇ならA」「基本はB」
- 正解じゃなく選び方を渡す

# 板書テンプレート
\`\`\`
目的：[決めたいこと]

        A     B     C
軸1    ○    △    ×
軸2    ...
軸3    ...

結論：〇〇なら A、△△なら B
\`\`\`

# 厳格ルール（重要）
❌ 情報を増やさない
❌ 理由を深掘りしない
❌ 手順を語らない
→ 深掘りは「詳細理論」

# Output Rules
- Use Markdown tables for comparison
- Chat: "ここは"どれを使うか"を決めます。" などの宣言のみ
- Respond in the same language as user input`;

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

        const history = messages.slice(0, -1).map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
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
                                            "それぞれの詳細な仕組みを教えて",
                                            "初心者におすすめはどれ？",
                                            "組み合わせて使うことはできる？"
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
        console.error('Compare Framework Error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}
