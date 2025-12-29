import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const next = searchParams.get("next") ?? "/";
    const provider = searchParams.get("provider") ?? "google";

    // Get the base URL from env or construct from request
    let baseUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL;

    if (!baseUrl) {
        // Construct from request - use x-forwarded-proto for protocol detection
        const proto = request.headers.get("x-forwarded-proto") || "http";
        const host = request.headers.get("host") || "localhost:3160";
        baseUrl = `${proto}://${host}`;
    }

    const redirectTo = `${baseUrl}/auth/callback?next=${encodeURIComponent(next)}`;

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: {
            redirectTo,
            skipBrowserRedirect: true,
        },
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Redirect to the OAuth URL
    return NextResponse.redirect(data.url);
}
