import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { RoomService } from '@/lib/services/roomService';

// POST /api/rooms/[id]/nodes
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { nodes } = body;

        // Security check: ensure user owns the room
        const room = await RoomService.getRoom(id, user.id);
        if (!room) {
            return NextResponse.json({ error: 'Room not found or unauthorized' }, { status: 404 });
        }

        const updatedBoard = await RoomService.saveBoard(id, nodes);
        return NextResponse.json({ board: updatedBoard });
    } catch (error: unknown) {
        console.error("Error saving board:", error);
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
