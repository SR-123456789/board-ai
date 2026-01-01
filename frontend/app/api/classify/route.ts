import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 30;

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

const CLASSIFICATION_PROMPT = `You are a classifier that determines which teaching framework to use based on the user's question.

# Framework Types
- concept: Use for "What is X?", understanding a single concept, knowing when to apply something
- theory: Use for deep theoretical understanding, proofs, derivations, mathematical reasoning
- organize: Use for organizing large amounts of information, listing many items, categorization
- compare: Use for "A vs B", choosing between options, comparing alternatives
- procedure: Use for "How to do X?", step-by-step guides, tutorials, implementation

# Rules
- Output ONLY the framework type as a single word: concept, theory, organize, compare, or procedure
- Do not explain your choice
- If unclear, default to "concept"

# Examples
- "APIとは何？" → concept
- "微分の証明" → theory
- "プログラミング言語一覧" → organize
- "React vs Vue" → compare
- "Gitの使い方" → procedure
- "機械学習について教えて" → concept
- "ソート アルゴリズム 比較" → compare
`;

export async function POST(req: Request) {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        return new Response(JSON.stringify({ error: 'API Key missing' }), { status: 500 });
    }

    try {
        const { messages } = await req.json();

        // Get the last user message for classification
        const lastMessage = messages[messages.length - 1];
        interface MessagePart {
            text?: string;
        }

        const userText = lastMessage.parts
            ? lastMessage.parts.find((p: MessagePart) => p.text)?.text || ''
            : lastMessage.content || '';

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: CLASSIFICATION_PROMPT,
        });

        const result = await model.generateContent(userText);
        const response = result.response.text().trim().toLowerCase();

        // Validate framework type
        const validFrameworks = ['concept', 'theory', 'organize', 'compare', 'procedure'];
        const framework = validFrameworks.includes(response) ? response : 'concept';

        return new Response(JSON.stringify({
            framework,
            messages  // Pass through messages for the frontend to use
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Classification Error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}
