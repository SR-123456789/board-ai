import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { ChatService } from "@/lib/services/chatService";
import { v4 as uuidv4 } from 'uuid';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

export async function POST(req: NextRequest) {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        return new Response('API Key missing', { status: 500 });
    }

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const { currentLevel, goal, roomId, userMessageId } = await req.json();

        // Save User Message
        if (roomId && goal) {
            try {
                const messageId = userMessageId || uuidv4();
                await ChatService.addMessage(roomId, user.id, {
                    id: messageId,
                    role: 'user',
                    content: goal // User's goal is the message content
                });
            } catch (e) {
                console.log("Failed to save user message", e);
            }
        }

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

        let responsePayload: any = null;
        let aiMessageId = uuidv4();

        // Try parsing success case
        try {
            const parsed = JSON.parse(text);
            if (parsed.goal && parsed.units && Array.isArray(parsed.units)) {
                responsePayload = {
                    type: "tool_call",
                    tool: "generate_roadmap",
                    args: parsed,
                    aiMessageId
                };
            }
        } catch { }

        if (responsePayload) {
            if (roomId) {
                try {
                    await ChatService.addMessage(roomId, user.id, {
                        id: aiMessageId,
                        role: 'assistant',
                        content: '学習ロードマップを作成しました。'
                    });
                } catch (e) {
                    console.error("Failed to save AI message", e);
                }
            }

            return new Response(JSON.stringify(responsePayload), {
                headers: { "Content-Type": "application/json" },
            });
        }

        // Fallback with a generic structure based on the goal
        const goalWords = goal.split(/[をのにはがで]/);
        const mainTopic = goalWords[0] || goal;

        const fallbackResponse = {
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
            },
            aiMessageId: uuidv4()
        };

        if (roomId) {
            try {
                await ChatService.addMessage(roomId, user.id, {
                    id: fallbackResponse.aiMessageId,
                    role: 'assistant',
                    content: '学習ロードマップを作成しました。（生成失敗のためテンプレートを使用）'
                });
            } catch (e) {
                console.error("Failed to save AI message", e);
            }
        }

        return new Response(JSON.stringify(fallbackResponse), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Generate roadmap API error:", error);
        return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
    }
}
