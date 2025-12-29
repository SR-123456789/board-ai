import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { UserService } from '@/lib/services/userService';

// GET /api/me
export async function GET() {
    const supabase = await createClient();
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (error || !authUser) {
        return NextResponse.json({ user: null }, { status: 200 }); // Return null if not logged in, easier for frontend to handle than 401 sometimes
    }

    const dbUser = await UserService.getUser(authUser.id);
    const planConfig = dbUser ? await UserService.getPlanConfig(dbUser.plan) : null;
    const maxTokens = planConfig?.monthlyLimit ?? 100000; // Default to 100k if not found

    return NextResponse.json({
        user: {
            id: authUser.id,
            email: authUser.email,
            plan: dbUser?.plan || 'free',
            tokenUsage: dbUser?.tokenUsage || 0,
            maxTokens: maxTokens
        }
    });
}
