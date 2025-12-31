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

        const { question, sectionTitle, unitTitle, explanation, roomId, userMessageId } = await req.json();

        // Save User Message
        if (roomId && question) {
            try {
                const messageId = userMessageId || uuidv4();
                await ChatService.addMessage(roomId, user.id, {
                    id: messageId,
                    role: 'user',
                    content: question
                });
            } catch (e) {
                console.log("Failed to save user message", e);
            }
        }

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
        const aiMessageContent = text || "ご質問ありがとうございます。もう少し詳しく教えていただけますか？";
        const aiMessageId = uuidv4();

        // Save AI Message
        if (roomId) {
            try {
                await ChatService.addMessage(roomId, user.id, {
                    id: aiMessageId,
                    role: 'assistant',
                    content: aiMessageContent
                });
            } catch (e) {
                console.error("Failed to save AI message", e);
            }
        }

        return new Response(JSON.stringify({
            type: "text",
            content: aiMessageContent,
            aiMessageId: aiMessageId
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
