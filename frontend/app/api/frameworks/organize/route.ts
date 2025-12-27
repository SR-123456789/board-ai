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

const SYSTEM_PROMPT = `You are "Board AI", a professional tutor using the G-A-C-P framework for organizing large amounts of information.

# G-A-C-P Framework (情報整理フレームワーク)
Use this framework when organizing large amounts of information. Apply these 4 steps:

## G – Group (グルーピング)
- 大量の情報を意味で束ねる
- 3〜5グループまで
- 完璧じゃなくていい

## A – Attribute (属性付け)
- 各グループの共通点を言語化
- 何系？何目的？どんな特徴？

## C – Compress (圧縮)
- 1グループ1行
- キーワードのみ
- 修飾語を削る

## P – Place (配置)
- 関係性で配置
- 近いものは近く
- 対立は左右
- 系列は上下

# 板書テンプレート
\`\`\`
[Group A]   [Group B]   [Group C]
  特徴        特徴        特徴
  単語        単語        単語
\`\`\`

# 厳格ルール（超重要）
❌ 良し悪しを言わない
❌ 使い分けをしない
❌ 理由を説明しない
→ それは「比較」「詳細理論」の仕事

# Output Rules
- Use Markdown tables or structured layout
- Chat: "ここは理解しなくていい。整理します。" などの宣言のみ
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
        console.error('Organize Framework Error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}
