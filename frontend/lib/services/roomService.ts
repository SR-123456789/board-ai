import prisma from '@/lib/prisma';
import { BoardNode } from '@/types/board';
import { RoomMode, Message } from '@/hooks/use-chat-store';

export class RoomService {
    static async createRoom(userId: string, title: string = 'Untitled Room', id?: string) {
        return prisma.room.create({
            data: {
                id, // Optional: if provided, use it. If not, Prisma/DB generates it.
                userId,
                title,
                board: {
                    create: {
                        nodes: [],
                    },
                },
            },
            include: {
                board: true,
            },
        });
    }

    static async getRoom(roomId: string, userId: string) {
        // Security check: ensure user owns the room
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: {
                board: true,
                messages: {
                    orderBy: { createdAt: 'asc' }
                },
                managedState: true
            },
        });

        if (!room || room.userId !== userId) {
            return null;
        }
        return room;
    }

    static async getUserRooms(userId: string) {
        return prisma.room.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            include: {
                board: {
                    select: { updatedAt: true }
                }
            }
        })
    }

    static async saveBoard(roomId: string, nodes: BoardNode[]) {
        // We assume JSON compatibility. Prisma handles JSON automatically but types might need casting if strict.
        // For simplicity in MVP, we cast to any or InputJsonValue.
        const board = await prisma.board.update({
            where: { roomId },
            data: {
                nodes: nodes as any,
            },
        });

        // Touch room updatedAt
        await prisma.room.update({
            where: { id: roomId },
            data: { updatedAt: new Date() }
        });

        return board;
    }

    static async saveMessages(roomId: string, messages: Message[]) {
        // This is a bulk replace/update approach. 
        // For efficiency, usually we append, but to sync with useChatStore structure which is array based:
        // We might need to delete old and re-insert, or upsert.
        // For this MVP, let's assume we append ONE message at a time via API, 
        // OR we just sync the whole state (less efficient but easier migration).
        // Given the requirement "logic from api route", let's make an append method.
        // BUT for migration, we need bulk insert.

        // Let's implement bulk sync for migration
        // Delete all and re-insert is heaviest but safest for full sync.

        await prisma.message.deleteMany({ where: { roomId } });

        // Batch insert
        // Prisma createMany is supported
        if (messages.length > 0) {
            await prisma.message.createMany({
                data: messages.map(m => ({
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
    static async saveManagedState(roomId: string, state: any) {
        return prisma.managedState.upsert({
            where: { roomId },
            create: {
                roomId,
                phase: state.phase,
                roadmap: state.roadmap ? state.roadmap : undefined,
                currentUnitIndex: state.currentUnitIndex,
                currentSectionIndex: state.currentSectionIndex,
                hearingData: state.hearingData ? state.hearingData : undefined
            },
            update: {
                phase: state.phase,
                roadmap: state.roadmap ? state.roadmap : undefined,
                currentUnitIndex: state.currentUnitIndex,
                currentSectionIndex: state.currentSectionIndex,
                hearingData: state.hearingData ? state.hearingData : undefined
            }
        });
    }
}
