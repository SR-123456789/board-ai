import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { RoomService } from '@/lib/services/roomService';

// POST /api/rooms/[id]/managed - Save managed state
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { id } = await params;

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Check ownership but allow creation if it doesn't exist yet
        let room = await RoomService.getRoom(id, user.id);

        const body = await request.json();
        const { state } = body;

        if (!room) {
            // New room from Managed Mode initialization
            room = await RoomService.createRoom(user.id, "家庭教師ルーム", id);
        }

        await RoomService.saveManagedState(id, state);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
