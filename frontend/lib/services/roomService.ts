import prisma from '@/lib/prisma';
import { BoardNode } from '@/types/board';
import { RoomMode, Message } from '@/hooks/use-chat-store';
import { Prisma } from '@prisma/client';

export class RoomService {
    static async createRoom(userId: string, title: string = 'Untitled Room', id?: string) {
        return prisma.room.create({
            data: {
                id: id || undefined, // Use explicit ID if provided (for client-generated UUIDs)
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

        // Post-process to fix double-serialized parts (legacy data)
        const messages = room.messages.map(msg => {
            let parts = msg.parts;
            if (typeof parts === 'string') {
                try {
                    parts = JSON.parse(parts);
                } catch (e) {
                    console.error("Failed to parse message parts", e);
                }
            }
            return { ...msg, parts };
        });

        return { ...room, messages };
    }

    static async getUserRooms(userId: string) {
        return prisma.room.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            include: {
                board: {
                    select: { updatedAt: true }
                },
                messages: {
                    orderBy: { createdAt: 'asc' },
                },
                managedState: true,
                parent: {
                    select: { title: true }
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
                nodes: nodes as unknown as Prisma.InputJsonValue,
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
                    parts: m.parts ? (m.parts as unknown as Prisma.InputJsonValue) : undefined, // Cast to InputJsonValue for Prisma
                    chatTurnId: m.chatTurnId
                }))
            });
        }
    }
    static async saveManagedState(roomId: string, state: {
        phase: string;
        roadmap?: Record<string, unknown> | null;
        currentUnitIndex: number;
        currentSectionIndex: number;
        hearingData?: Record<string, unknown> | null;
    }) {
        return prisma.managedState.upsert({
            where: { roomId },
            create: {
                roomId,
                phase: state.phase,
                roadmap: state.roadmap ? (state.roadmap as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
                currentUnitIndex: state.currentUnitIndex,
                currentSectionIndex: state.currentSectionIndex,
                hearingData: state.hearingData ? (state.hearingData as unknown as Prisma.InputJsonValue) : Prisma.DbNull
            },
            update: {
                phase: state.phase,
                roadmap: state.roadmap ? (state.roadmap as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
                currentUnitIndex: state.currentUnitIndex,
                currentSectionIndex: state.currentSectionIndex,
                hearingData: state.hearingData ? (state.hearingData as unknown as Prisma.InputJsonValue) : Prisma.DbNull
            }
        });
    }

    /**
     * Copy a room to create a child room
     * - Copies board nodes
     * - Does NOT copy messages (starts fresh conversation)
     * - Does NOT copy managed state
     */
    static async copyRoom(roomId: string, userId: string, initialQuestion?: string) {
        // Get original room with board
        const originalRoom = await prisma.room.findUnique({
            where: { id: roomId },
            include: { board: true }
        });

        if (!originalRoom || originalRoom.userId !== userId) {
            return null;
        }

        // Create new room with parent reference
        const newRoom = await prisma.room.create({
            data: {
                userId,
                title: originalRoom.title ? `${originalRoom.title} (copy)` : 'Untitled Room (copy)',
                parentId: roomId,
                board: {
                    create: {
                        nodes: originalRoom.board?.nodes ?? [],
                    },
                },
            },
            include: {
                board: true,
            },
        });

        // If initial question is provided, create an initial user message
        if (initialQuestion) {
            await prisma.message.create({
                data: {
                    roomId: newRoom.id,
                    role: 'user',
                    content: initialQuestion,
                }
            });
        }

        return newRoom;
    }
}
