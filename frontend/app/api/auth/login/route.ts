import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import type { OAuthProvider } from "@/types/api";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const next = requestUrl.searchParams.get("next") ?? "/";
    const provider = requestUrl.searchParams.get("provider") ?? "google";

    // Get the base URL - prioritize env vars, fallback to request origin
    const baseUrl = process.env.FRONTEND_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        requestUrl.origin;

    const redirectTo = `${baseUrl}/auth/callback?next=${encodeURIComponent(next)}`;

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as OAuthProvider,
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
