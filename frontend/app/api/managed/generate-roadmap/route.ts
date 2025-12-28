import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

export async function POST(req: NextRequest) {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        return new Response('API Key missing', { status: 500 });
    }

    try {
        const { currentLevel, goal } = await req.json();

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                responseMimeType: "application/json",
            },
        });

        const prompt = `あなたは優秀なカリキュラムデザイナーです。

以下の情報を元に、学習ロードマップを作成してください：

**現在のレベル:** ${currentLevel}
**学習目標:** ${goal}

以下のJSON形式で出力してください。必ず有効なJSONのみを出力してください：

{
  "goal": "学習目標の要約",
  "currentLevel": "現在のレベルの要約",
  "units": [
    {
      "id": "unit-1",
      "title": "単元1のタイトル",
      "sections": [
        { "id": "section-1-1", "title": "節1のタイトル" },
        { "id": "section-1-2", "title": "節2のタイトル" }
      ]
    }
  ]
}

**重要なルール:**
- units は2〜5個作成（大きなトピック）
- 各unit の sections は2〜4個作成（詳細トピック）
- 基礎から応用へと順序付け
- ユーザーの現在のレベルを考慮し、すでに知っている内容はスキップ
- 節のタイトルは具体的で実行可能なものに（例：「変数とは何か」「関数の定義方法」）
- 全て日本語で書く`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        try {
            const parsed = JSON.parse(text);

            // Validate the response structure
            if (parsed.goal && parsed.units && Array.isArray(parsed.units)) {
                return new Response(JSON.stringify({
                    type: "tool_call",
                    tool: "generate_roadmap",
                    args: parsed,
                }), {
                    headers: { "Content-Type": "application/json" },
                });
            }
        } catch (parseError) {
            console.error("Failed to parse JSON:", parseError, text);
        }

        // Fallback with a generic structure based on the goal
        const goalWords = goal.split(/[をのにはがで]/);
        const mainTopic = goalWords[0] || goal;

        return new Response(JSON.stringify({
            type: "tool_call",
            tool: "generate_roadmap",
            args: {
                goal: goal,
                currentLevel: currentLevel,
                units: [
                    {
                        id: "unit-1",
                        title: `${mainTopic}の基礎`,
                        sections: [
                            { id: "section-1-1", title: `${mainTopic}とは何か` },
                            { id: "section-1-2", title: `${mainTopic}の基本概念` },
                            { id: "section-1-3", title: `${mainTopic}の基本操作` }
                        ]
                    },
                    {
                        id: "unit-2",
                        title: `${mainTopic}の実践`,
                        sections: [
                            { id: "section-2-1", title: `${mainTopic}の応用テクニック` },
                            { id: "section-2-2", title: `${mainTopic}の実践演習` }
                        ]
                    }
                ]
            }
        }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Generate roadmap API error:", error);
        return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
    }
}
