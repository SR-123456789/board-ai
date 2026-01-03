import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

export async function POST(req: Request) {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        return new Response('API Key missing', { status: 500 });
    }

    try {
        const { code, error } = await req.json();

        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash", 
            systemInstruction: `You are a D2 expert specialized in fixing rendering errors for the Kroki D2 engine.
You will receive D2 code and a specific error message.

# FEW-SHOT EXAMPLES (LEARN FROM THESE):

<example>
Input Code:
A -> B { style.stroke-dash: 4 arrowHead: none }
Error: expected "stroke-dash" to be a number between 0 and 10
Analysis: Missing semicolon after 4, and "arrowHead" is invalid.
Fixed Code:
A -> B { style.stroke-dash: 4; target-arrowhead: "" }
</example>

<example>
Input Code:
A -> B: Label { stroke-dash: 3 }
Error: ...
Analysis: stroke-dash requires style prefix. Label needs quotes.
Fixed Code:
A -> B: "Label" { style.stroke-dash: 3 }
</example>

# STRICT D2 SYNTAX RULES:
1. **SEMICOLONS**: ALWAYS use a semicolon \`;\` between properties if they are on the same line.
2. **STYLE PREFIX**: Properties like \`strok-dash\`, \`fill\`, \`stroke\`, \`stroke-width\` MUST be prefixed with \`style.\`.
3. **ARROWHEADS**: To remove an arrow, use \`target-arrowhead: ""\`. DO NOT use \`arrowHead: none\`.
4. **QUOTING**: ALWAYS wrap ALL labels and IDs in double quotes. 
5. **CONNECTION**: Use \`->\` for directional or \`--\` for non-directional edges.

# YOUR MISSION:
Analyze the error (check line/column if provided) and return ONLY the RAW fixed D2 code. No markdown, no comments.`
        });

        const prompt = `Rendering Error: ${error}\n\nOriginal D2 Code to fix:\n${code}`;
        const result = await model.generateContent(prompt);
        const fixedCode = result.response.text().trim();

        // Clean up any stray markdown backticks if AI ignored instructions
        const cleanedCode = fixedCode.replace(/^```d2\n?/, '').replace(/\n?```$/, '');

        return new Response(JSON.stringify({ fixedCode: cleanedCode }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err) {
        console.error('D2 fix API error:', err);
        return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
    }
}
