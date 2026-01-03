import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { RoomService } from '@/lib/services/roomService';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json().catch(() => ({}));
        const initialQuestion = body.initialQuestion as string | undefined;

        const newRoom = await RoomService.copyRoom(id, user.id, initialQuestion);

        if (!newRoom) {
            return NextResponse.json({ error: 'Room not found or access denied' }, { status: 404 });
        }

        return NextResponse.json(newRoom);
    } catch (error) {
        console.error('Error copying room:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
