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

        const { userLevel, roomId, userMessageId } = await req.json();

        // Save User Message
        if (roomId && userLevel) {
            try {
                // If userMessageId is provided, use it, otherwise generate one (though frontend should provide it)
                const messageId = userMessageId || uuidv4();

                // Check if message already exists (to avoid duplicates on retry) 
                // ChatService.addMessage throws if room not found/owned
                // But generally we just try to add. 
                // Prisma create fails if ID exists.
                // We should handle that optionally or just let it fail silently if ID match?
                // ChatService.addMessage uses create.

                // Let's rely on catch block or check existence? 
                // For performance, just try. If duplicate ID, it throws.
                // But we want to proceed.
                // So maybe check existence via side-channel or just use upsert in service?
                // Service uses create.
                // Let's try-catch the addMessage specifically.

                await ChatService.addMessage(roomId, user.id, {
                    id: messageId,
                    role: 'user',
                    content: userLevel
                });
            } catch (e) {
                console.log("Failed to save user message (might be duplicate)", e);
            }
        }

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

        const aiMessageContent = text || "目標を教えてください。どんなことができるようになりたいですか？";
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
        console.error("Hearing goal API error:", error);
        return new Response(JSON.stringify({
            type: "text",
            content: "目標を教えてください。どんなことができるようになりたいですか？",
        }), {
            headers: { "Content-Type": "application/json" },
        });
    }
}
