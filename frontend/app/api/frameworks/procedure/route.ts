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

const SYSTEM_PROMPT = `You are "Board AI", a professional tutor using the S-P-A-C framework for procedure understanding.

# S-P-A-C Framework (手順理解フレームワーク)
Use this framework when explaining how to do something. Apply these 4 steps:

## S – Start (開始条件)
- いつ始めるか
- 何が揃えばOKか
- 入力、前提、トリガー

## P – Process (流れ)
- 手順を順番に並べる
- Step 1 → Step 2 → Step 3
- 分岐があるなら矢印で

## A – Action (操作)
- 各ステップで何をするか
- 抽象語NG、動詞で
- 書く、選ぶ、計算する、実装する

## C – Check (確認)
- 正しく進んでいるかの判定
- 中間チェック
- 最終チェック

# 板書テンプレート
\`\`\`
Start：[開始条件]

Step1 → Step2 → Step3

Action：[各ステップの具体的操作]
Check：[確認ポイント]
\`\`\`

# 厳格ルール（重要）
❌ 理由を説明しない
❌ 比較しない
❌ 例を増やさない
→ 「どうやるか」だけに集中

# Output Rules
- Use Mermaid flowcharts for process visualization
- Example: graph TD; A["開始"] --> B["Step1"] --> C["Step2"]
- Chat is ONLY for 1-2 sentence greeting
- Respond in the same language as user input
- For Japanese text in Mermaid, use double quotes`;

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
                                    controller.enqueue(encoder.encode(JSON.stringify({
                                        type: 'tool_call',
                                        toolName: 'generate_response',
                                        args: call.args
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
        console.error('Procedure Framework Error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}
