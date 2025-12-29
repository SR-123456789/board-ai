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
        // Verify ownership
        const room = await RoomService.getRoom(id, user.id);
        if (!room) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        const body = await request.json();
        const { state } = body;

        await RoomService.saveManagedState(id, state);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
