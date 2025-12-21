import { GoogleAIFileManager } from "@google/generative-ai/server";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";


// Initialize existing FileManager
const fileManager = new GoogleAIFileManager(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function POST(req: Request) {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        return new Response('API Key missing', { status: 500 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return new Response("No file uploaded", { status: 400 });
        }

        // Convert file to buffer and save temporarily
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Use tmp directory for temporary storage
        const tempPath = join("/tmp", `${uuidv4()}-${file.name}`);
        await writeFile(tempPath, buffer);

        try {
            // Upload to Google File API
            const uploadResponse = await fileManager.uploadFile(tempPath, {
                mimeType: file.type,
                displayName: file.name,
            });

            // Cleanup temp file
            await unlink(tempPath);

            return new Response(JSON.stringify({
                fileUri: uploadResponse.file.uri,
                mimeType: uploadResponse.file.mimeType
            }), {
                headers: { 'Content-Type': 'application/json' }
            });

        } catch (uploadError) {
            // Ensure temp file is cleaned up even if upload fails
            try {
                await unlink(tempPath);
            } catch (e) {
                console.error("Failed to delete temp file:", e);
            }
            throw uploadError;
        }

    } catch (error) {
        console.error("File upload error:", error);
        return new Response(JSON.stringify({ error: "File upload failed", details: String(error) }), { status: 500 });
    }
}
