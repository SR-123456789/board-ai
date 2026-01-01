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

        const { unitTitle, sectionTitle, goal, context, roomId } = await req.json();

        // Note: We do NOT save a user message here, as this is typically a system-triggered action.

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                responseMimeType: "application/json",
            },
        });

        const prompt = `あなたは優秀な家庭教師です。学習ロードマップの特定の節を教えてください。

**現在の節:** 「${sectionTitle}」（単元「${unitTitle}」内）
**学習目標:** ${goal}

**ロードマップ全体の流れ:**
${context}

**指示:**
ロードマップ全体の流れを意識し、前後の文脈から逸脱しないように、この節「${sectionTitle}」で教えるべきことだけを的確に解説してください。

以下のJSON形式で出力してください。必ず有効なJSONのみを出力してください：

{
  "explanation": "Markdown形式の解説（300〜500文字程度、見出しや箇条書きを使用）",
  "practiceQuestion": {
    "question": "確認問題の文章",
    "type": "choice",
    "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
    "correctAnswer": 0,
    "explanation": "正解の解説"
  },
  "chatMessage": "チャット用の短いメッセージ"
}

**重要な注意:**
- explanation: この節の具体的な内容を教える解説。一般的な説明ではなく、この「${sectionTitle}」に特化した具体的な内容
- practiceQuestion.type: "choice"を使用し、4つの具体的な選択肢を用意
- practiceQuestion.correctAnswer: 正解の選択肢のインデックス（0から始まる）
- 全ての内容を日本語で書く`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        let responsePayload: any = null;
        let aiMessageId = uuidv4();

        try {
            const parsed = JSON.parse(text);
            if (parsed.explanation && parsed.practiceQuestion && parsed.chatMessage) {
                responsePayload = {
                    type: "tool_call",
                    tool: "teach_section",
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
                        content: responsePayload.args.chatMessage // Use the generated chat message!
                    });
                } catch (e) {
                    console.error("Failed to save AI message", e);
                }
            }

            return new Response(JSON.stringify(responsePayload), {
                headers: { "Content-Type": "application/json" },
            });
        }

        // AI-generated fallback using simpler prompt
        const fallbackModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const fallbackPrompt = `「${sectionTitle}」について、初心者向けに300文字程度で簡潔に説明してください。Markdown形式で見出しと箇条書きを使ってください。`;
        const fallbackResult = await fallbackModel.generateContent(fallbackPrompt);
        const fallbackExplanation = fallbackResult.response.text();

        const fallbackResponse = {
            type: "tool_call",
            tool: "teach_section",
            args: {
                explanation: fallbackExplanation || `# ${sectionTitle}\n\nこの節では${sectionTitle}について学びます。`,
                practiceQuestion: {
                    question: `${sectionTitle}についての理解度をチェックしましょう。この概念の主なポイントは何ですか？`,
                    type: "freeform",
                    keywords: [sectionTitle.split(/[のをにはが]/)[0]],
                    explanation: `${sectionTitle}の基本的なポイントを理解することが大切です。`
                },
                chatMessage: `📖 ${sectionTitle}を学んでいきましょう！`
            },
            aiMessageId: uuidv4()
        };

        if (roomId) {
            try {
                await ChatService.addMessage(roomId, user.id, {
                    id: fallbackResponse.aiMessageId,
                    role: 'assistant',
                    content: fallbackResponse.args.chatMessage
                });
            } catch (e) {
                console.error("Failed to save AI message", e);
            }
        }

        return new Response(JSON.stringify(fallbackResponse), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Teach section API error:", error);
        return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
    }
}
