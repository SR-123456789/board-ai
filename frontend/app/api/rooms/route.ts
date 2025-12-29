import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { RoomService } from '@/lib/services/roomService';

// GET /api/rooms
export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rooms = await RoomService.getUserRooms(user.id);
    return NextResponse.json({ rooms });
}

// POST /api/rooms
export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { title } = body;
        const room = await RoomService.createRoom(user.id, title);
        return NextResponse.json({ room });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
