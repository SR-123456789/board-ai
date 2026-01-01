import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { RoomService } from '@/lib/services/roomService';

// GET /api/rooms/[id]
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { id } = await params;

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const room = await RoomService.getRoom(id, user.id);
    if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({ room });
}

// POST /api/rooms/[id]/nodes - Save board nodes
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { id } = await params;

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Verify ownership first
        const room = await RoomService.getRoom(id, user.id);
        if (!room) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        const body = await request.json();
        const { nodes } = body;

        await RoomService.saveBoard(id, nodes);
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
