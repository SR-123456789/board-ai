import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

export async function POST(req: NextRequest) {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        return new Response('API Key missing', { status: 500 });
    }

    try {
        const { question, sectionTitle, unitTitle, explanation } = await req.json();

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
        });

        const prompt = `あなたは優秀な家庭教師です。ユーザーが学習中に質問しました。

**現在学習中の節:** 「${sectionTitle}」（単元「${unitTitle}」内）

**この節の解説内容:**
${explanation}

**ユーザーの質問:**
${question}

**タスク:**
- ユーザーの質問に対して、わかりやすく回答してください
- この節の内容に関連付けて説明してください
- Markdown形式で、適切に見出しや箇条書きを使用してください
- 回答は150〜300文字程度で簡潔に
- 日本語で回答してください`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        return new Response(JSON.stringify({
            type: "text",
            content: text || "ご質問ありがとうございます。もう少し詳しく教えていただけますか？",
        }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Answer question API error:", error);
        return new Response(JSON.stringify({
            type: "text",
            content: "申し訳ありません、回答の生成中にエラーが発生しました。",
        }), {
            headers: { "Content-Type": "application/json" },
        });
    }
}
