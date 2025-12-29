import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { RoomService } from '@/lib/services/roomService';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { rooms, chatRooms, managedRooms } = body;

        // Process Room migrations
        // This is a naive implementation: it assumes all local rooms are "new" to the server
        // or overwrites them based on ID. Since IDs are UUIDs, collision is rare.
        // Strategy: Upsert based on ID.

        const results = {
            success: 0,
            failed: 0
        };

        // Combine data sources. BoardStore has 'nodes', ChatStore has 'messages', ManagedStore has state.
        // We need to group them by Room ID.

        const allRoomIds = new Set([
            ...Object.keys(rooms || {}),
            ...Object.keys(chatRooms || {}),
            ...Object.keys(managedRooms || {})
        ]);

        for (const roomId of allRoomIds) {
            try {
                const boardData = rooms ? rooms[roomId] : null;
                const chatData = chatRooms ? chatRooms[roomId] : null;
                const managedData = managedRooms ? managedRooms[roomId] : null;

                // Ensure Room exists
                await prisma.room.upsert({
                    where: { id: roomId },
                    create: {
                        id: roomId,
                        userId: user.id,
                        title: 'Imported Room', // We could try to extract title from content
                    },
                    update: {
                        userId: user.id, // Claim room if exists
                    }
                });

                // Update Board
                if (boardData && boardData.nodes) {
                    await prisma.board.upsert({
                        where: { roomId },
                        create: {
                            roomId,
                            nodes: boardData.nodes,
                        },
                        update: {
                            nodes: boardData.nodes
                        }
                    });
                } else if (!boardData) {
                    // Ensure board exists even if empty
                    await prisma.board.upsert({
                        where: { roomId },
                        create: { roomId, nodes: [] },
                        update: {}
                    });
                }

                // Update Messages
                if (chatData && chatData.messages) {
                    await prisma.message.deleteMany({ where: { roomId } });
                    if (chatData.messages.length > 0) {
                        await prisma.message.createMany({
                            data: chatData.messages.map((m: any) => ({
                                id: m.id,
                                roomId,
                                role: m.role,
                                content: m.content,
                                parts: m.parts ? JSON.stringify(m.parts) : undefined,
                                chatTurnId: m.chatTurnId
                            }))
                        });
                    }
                }

                // Update Managed State
                if (managedData) {
                    await prisma.managedState.upsert({
                        where: { roomId },
                        create: {
                            roomId,
                            phase: managedData.phase,
                            roadmap: managedData.roadmap ? managedData.roadmap : undefined,
                            currentUnitIndex: managedData.currentUnitIndex,
                            currentSectionIndex: managedData.currentSectionIndex,
                            hearingData: managedData.hearingData ? managedData.hearingData : undefined
                        },
                        update: {
                            phase: managedData.phase,
                            roadmap: managedData.roadmap ? managedData.roadmap : undefined,
                            currentUnitIndex: managedData.currentUnitIndex,
                            currentSectionIndex: managedData.currentSectionIndex,
                            hearingData: managedData.hearingData ? managedData.hearingData : undefined
                        }
                    });
                }

                results.success++;
            } catch (e) {
                console.error(`Failed to migrate room ${roomId}`, e);
                results.failed++;
            }
        }

        return NextResponse.json({ message: 'Migration completed', results });

    } catch (error: any) {
        console.error('Migration error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
