import { GoogleGenerativeAI, SchemaType, Tool, FunctionDeclaration } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

// Tool for generating roadmap
const GENERATE_ROADMAP_TOOL = {
    name: "generate_roadmap",
    description: "Generate a learning roadmap based on user's level and goal",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            goal: {
                type: SchemaType.STRING,
                description: "The learning goal"
            },
            currentLevel: {
                type: SchemaType.STRING,
                description: "User's current knowledge level"
            },
            units: {
                type: SchemaType.ARRAY,
                description: "Learning units (major topics)",
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        id: { type: SchemaType.STRING },
                        title: { type: SchemaType.STRING, description: "Unit title" },
                        sections: {
                            type: SchemaType.ARRAY,
                            description: "Sections within this unit",
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    id: { type: SchemaType.STRING },
                                    title: { type: SchemaType.STRING, description: "Section title" }
                                },
                                required: ["id", "title"]
                            }
                        }
                    },
                    required: ["id", "title", "sections"]
                }
            }
        },
        required: ["goal", "currentLevel", "units"]
    }
};

// Tool for teaching a section
const TEACH_SECTION_TOOL = {
    name: "teach_section",
    description: "Teach a section with explanation on the board and a practice question",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            explanation: {
                type: SchemaType.STRING,
                description: "Markdown content to display on the board explaining this section"
            },
            practiceQuestion: {
                type: SchemaType.OBJECT,
                description: "Practice question to test understanding",
                properties: {
                    question: { type: SchemaType.STRING },
                    type: { type: SchemaType.STRING, enum: ["choice", "freeform"] },
                    options: {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.STRING },
                        description: "Options for choice type"
                    },
                    correctAnswer: {
                        type: SchemaType.NUMBER,
                        description: "Index of correct answer for choice type (0-based)"
                    },
                    keywords: {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.STRING },
                        description: "Keywords to look for in freeform answers"
                    },
                    explanation: { type: SchemaType.STRING, description: "Explanation shown after answering" }
                },
                required: ["question", "type"]
            },
            chatMessage: {
                type: SchemaType.STRING,
                description: "Brief message for chat (one line)"
            }
        },
        required: ["explanation", "practiceQuestion", "chatMessage"]
    }
};

// Tool for evaluating answer
const EVALUATE_ANSWER_TOOL = {
    name: "evaluate_answer",
    description: "Evaluate user's answer and decide next action",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            isCorrect: { type: SchemaType.BOOLEAN },
            feedback: { type: SchemaType.STRING, description: "Feedback message for chat (one line)" },
            shouldRepeat: { type: SchemaType.BOOLEAN, description: "Whether to repeat/modify the section" },
            additionalExplanation: {
                type: SchemaType.STRING,
                description: "Additional explanation to add to board if needed (optional)"
            }
        },
        required: ["isCorrect", "feedback", "shouldRepeat"]
    }
};

export async function POST(req: Request) {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        return new Response('API Key missing', { status: 500 });
    }

    try {
        const { action, messages, context } = await req.json();

        let systemPrompt = "";
        let tools: Tool[] = [];

        switch (action) {
            case "hearing_level":
                systemPrompt = `You are a friendly learning assistant. Ask the user about their current knowledge level regarding the topic they want to learn. Be conversational and specific. Keep your response to 2-3 sentences. Always respond in the same language as the user.`;
                break;

            case "hearing_goal":
                systemPrompt = `You are a friendly learning assistant. The user has told you their current level: "${context.userLevel || 'unknown'}". Now ask them what they want to be able to understand or do after learning. Be specific and help them articulate a clear goal. Keep your response to 2-3 sentences. Always respond in the same language as the user.`;
                break;

            case "generate_roadmap":
                systemPrompt = `You are an expert curriculum designer. Based on the user's current level and learning goal, create a structured learning roadmap.

Rules:
- Create 2-5 units (major topics)
- Each unit should have 2-4 sections (subtopics)
- Order from foundational to advanced
- Consider the user's current level - skip basics they already know
- Make section titles specific and actionable
- Use the generate_roadmap tool to output the roadmap

Current Level: ${context.currentLevel}
Goal: ${context.goal}`;
                tools = [{ functionDeclarations: [GENERATE_ROADMAP_TOOL as unknown as FunctionDeclaration] }];
                break;

            case "teach_section":
                systemPrompt = `You are an expert tutor teaching a specific section of a learning roadmap.

Current section: "${context.sectionTitle}" in unit "${context.unitTitle}"
Learning goal: ${context.goal}
Current level: ${context.currentLevel}

Rules:
1. Create a clear, concise explanation (Markdown format) for the board
2. Use headers, lists, examples, and code blocks as appropriate
3. Create ONE practice question to test understanding:
   - Use "choice" for factual/conceptual questions (3-4 options)
   - Use "freeform" for application/analysis questions
4. Keep the chat message to ONE line only
5. Respond in the same language as the user's messages

Use the teach_section tool.`;
                tools = [{ functionDeclarations: [TEACH_SECTION_TOOL as unknown as FunctionDeclaration] }];
                break;

            case "evaluate_answer":
                systemPrompt = `You are evaluating a student's answer to a practice question.

Question: ${context.question}
Expected: ${context.expected}
User's answer: ${context.userAnswer}

Rules:
1. Determine if the answer is correct (be generous - partial credit for close answers)
2. Provide brief, encouraging feedback (one line)
3. If wrong, suggest they review but don't be discouraging
4. shouldRepeat should be true only for completely wrong answers
5. Respond in the same language as the user

Use the evaluate_answer tool.`;
                tools = [{ functionDeclarations: [EVALUATE_ANSWER_TOOL as unknown as FunctionDeclaration] }];
                break;

            case "modify_roadmap":
                systemPrompt = `You are helping modify a learning roadmap based on user feedback.

Current roadmap: ${JSON.stringify(context.roadmap)}
User request: "${context.userRequest}"

Understand what the user wants to change and use the generate_roadmap tool to output an updated roadmap. Possible changes:
- Focus on specific sections (mark as important)
- Skip sections user already knows
- Add more depth to certain areas
- Reorder topics

Keep the same structure but adjust based on the request. Respond in the same language as the user.`;
                tools = [{ functionDeclarations: [GENERATE_ROADMAP_TOOL as unknown as FunctionDeclaration] }];
                break;

            default:
                return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400 });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemPrompt,
            ...(tools.length > 0 && { tools }),
        });

        // Filter history to ensure it starts with a user message
        // Gemini requires the first message in history to be from the user
        interface LocalMessage {
            role: string;
            content?: string;
        }

        const filteredMessages = messages.filter((m: LocalMessage) => m.content?.trim());
        let historyStartIndex = 0;
        for (let i = 0; i < filteredMessages.length; i++) {
            if (filteredMessages[i].role === 'user') {
                historyStartIndex = i;
                break;
            }
        }

        // Build history from the first user message, excluding the last message (which we'll send)
        const historyMessages = filteredMessages.slice(historyStartIndex, -1);

        const chat = model.startChat({
            history: historyMessages.length > 0 ? historyMessages.map((m: LocalMessage) => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.content }],
            })) : [],
        });

        // Get the last user message to send
        const lastMessage = filteredMessages[filteredMessages.length - 1];
        const messageToSend = lastMessage?.role === 'user' ? lastMessage.content : "Start";

        const result = await chat.sendMessage(messageToSend);
        const response = result.response;

        // Check for tool calls
        const candidate = response.candidates?.[0];
        const functionCalls = candidate?.content?.parts?.filter(p => 'functionCall' in p && p.functionCall);

        if (functionCalls && functionCalls.length > 0) {
            const functionCall = functionCalls[0].functionCall;
            if (functionCall) {
                return new Response(JSON.stringify({
                    type: "tool_call",
                    tool: functionCall.name,
                    args: functionCall.args,
                }), {
                    headers: { "Content-Type": "application/json" },
                });
            }
        }

        // Regular text response
        const text = response.text();
        return new Response(JSON.stringify({
            type: "text",
            content: text,
        }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error("Managed API error:", error);
        return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
    }
}
