import prisma from '@/lib/prisma';
import { Message, MessagePart } from '@/hooks/use-chat-store';

/**
 * APIルートで使用する拡張メッセージPart型（tool_useを含む）
 */
interface ExtendedMessagePart {
    text?: string;
    fileData?: { fileUri: string; mimeType: string };
    tool_use?: Record<string, unknown>;
}

/**
 * APIルートで使用する拡張Message型
 */
interface ExtendedMessage extends Omit<Message, 'parts'> {
    parts?: ExtendedMessagePart[];
}

export class ChatService {
    static async getMessages(roomId: string, userId: string) {
        // Verify access via RoomService or direct check
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            select: { userId: true }
        });

        if (!room || room.userId !== userId) {
            throw new Error('Unauthorized or Room not found');
        }

        const messages = await prisma.message.findMany({
            where: { roomId },
            orderBy: { createdAt: 'asc' }
        });

        // Convert Prisma model to App Message type
        return messages.map(m => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            parts: m.parts ? JSON.parse(m.parts as string) : undefined,
            chatTurnId: m.chatTurnId || undefined,
            createdAt: m.createdAt.getTime()
        }));
    }

    static async addMessage(roomId: string, userId: string, message: ExtendedMessage) {
        // Verify access
        const room = await prisma.room.findUnique({
            where: { id: roomId },
            select: { userId: true }
        });

        if (!room || room.userId !== userId) {
            throw new Error('Unauthorized or Room not found');
        }

        return prisma.message.create({
            data: {
                id: message.id,
                roomId,
                role: message.role,
                content: message.content,
                parts: message.parts ? JSON.stringify(message.parts) : undefined,
                chatTurnId: message.chatTurnId
            }
        });
    }
}
