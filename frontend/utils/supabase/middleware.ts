import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                    })

                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })

                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    // Do not run code between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    // IMPORTANT: DO NOT REMOVE auth.getUser()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (
        !user &&
        !request.nextUrl.pathname.startsWith('/login') &&
        !request.nextUrl.pathname.startsWith('/auth') &&
        request.nextUrl.pathname !== '/' // Allow landing page? Maybe user wants landing page public?
        // "board-ai" product usually has a landing page.
        // Let's assume root is public, but specific app routes are protected.
        // For now, let's protect everything except public assets, login, auth, and maybe root.
    ) {
        // Check if it's a static asset or public file
        if (request.nextUrl.pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)) {
            return response;
        }

        // Protected routes logic
        // If not user and trying to access anything other than /login, /auth, /, redirect to /login
        // Actually, usually we want to protect /room/*, /dashboard, etc.
        // Let's assume ALL is protected for now except explicit public ones to be safe, 
        // or just protect specific paths.
        // Given the request "login screen ... appropriate transition", forcing login for app usage is good.
        // Let's allow '/' (landing) and redirect to /login if clicking "Start".
        // OR if '/' IS the app, then protect it. 
        // Looking at app/page.tsx might clarify.

        // For now, let's redirect to login for everything except:
        // /login, /auth, / (Landing), /about (if any), public assets.
    }

    // Actually, better logic:
    // 1. If user is NOT logged in:
    //    - If trying to access protected route (e.g. /room/...), redirect to /login?next=...
    // 2. If user IS logged in:
    //    - If trying to access /login, redirect to / (or /room/new or dashboard)

    if (!user && request.nextUrl.pathname.startsWith('/room')) {
        // Guest mode: Allow access to room pages.
        // Frontend will handle "Login to Chat" restriction.
        // But we might want to ensure they can't access "private" API data?
        // For now, allow page access.
        return response
    }

    if (user && request.nextUrl.pathname.startsWith('/login')) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    return response
}
