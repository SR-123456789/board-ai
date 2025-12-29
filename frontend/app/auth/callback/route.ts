import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get("next") ?? "/";

    // Use FRONTEND_URL if set (for production), otherwise use origin
    const baseUrl = process.env.FRONTEND_URL || origin;

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            return NextResponse.redirect(`${baseUrl}${next}`);
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${baseUrl}/auth/auth-code-error`);
}

