import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

export async function POST(req: NextRequest) {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        return new Response('API Key missing', { status: 500 });
    }

    try {
        const { userLevel } = await req.json();

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
        });

        const prompt = `あなたは親しみやすい学習アシスタントです。

ユーザーが以下のように自分の現在のレベルを教えてくれました：
「${userLevel}」

これを踏まえて、学習の目標（ゴール）を聞いてください。
具体的で達成可能な目標を言語化できるよう、優しくガイドしてください。

**必ず以下の形式で応答してください：**
2〜3文程度で、自然な日本語で回答してください。
例：「〜ですね！では、この学習を通じて何ができるようになりたいですか？例えば〜」`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        return new Response(JSON.stringify({
            type: "text",
            content: text || "目標を教えてください。どんなことができるようになりたいですか？",
        }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Hearing goal API error:", error);
        return new Response(JSON.stringify({
            type: "text",
            content: "目標を教えてください。どんなことができるようになりたいですか？",
        }), {
            headers: { "Content-Type": "application/json" },
        });
    }
}
