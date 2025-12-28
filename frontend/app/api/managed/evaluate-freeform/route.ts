import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

export async function POST(req: NextRequest) {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        return new Response('API Key missing', { status: 500 });
    }

    try {
        const { question, userAnswer } = await req.json();

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                responseMimeType: "application/json",
            },
        });

        const prompt = `あなたは採点者です。以下の問題に対するユーザーの回答が正しいかを判定してください。

**問題:** ${question}

**ユーザーの回答:** ${userAnswer}

以下のJSON形式で判定してください：

{
  "isCorrect": true または false,
  "feedback": "フィードバック（50文字以内）"
}

**判定基準:**
- 問題の意図を理解し、適切な回答であれば正解
- 表現が違っても意味的に正しければ正解
- 部分的に正しい場合も正解とする（寛容に）
- 全く的外れな回答のみ不正解`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        try {
            const parsed = JSON.parse(text);
            return new Response(JSON.stringify({
                isCorrect: parsed.isCorrect ?? true,
                feedback: parsed.feedback || (parsed.isCorrect ? '正解です！' : 'もう少し考えてみましょう'),
            }), {
                headers: { "Content-Type": "application/json" },
            });
        } catch (parseError) {
            return new Response(JSON.stringify({
                isCorrect: true,
                feedback: '回答を確認しました！',
            }), {
                headers: { "Content-Type": "application/json" },
            });
        }

    } catch (error) {
        console.error("Evaluate freeform API error:", error);
        return new Response(JSON.stringify({
            isCorrect: true,
            feedback: '回答を確認しました',
        }), {
            headers: { "Content-Type": "application/json" },
        });
    }
}
