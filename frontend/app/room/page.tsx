'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/hooks/use-chat-store';
import { useBoardStore } from '@/hooks/use-board-store';
import { Plus, MessageSquare, Clock, Trash2, ArrowLeft } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = WEEKDAYS[date.getDay()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}/${day} (${weekday}) ${hours}:${minutes}`;
};

interface RoomInfo {
    id: string;
    lastMessage?: string;
    messageCount: number;
    lastUpdated: number;
}

export default function RoomListPage() {
    const [mounted, setMounted] = useState(false);
    const [rooms, setRooms] = useState<RoomInfo[]>([]);
    const router = useRouter();
    const chatStore = useChatStore();
    const boardStore = useBoardStore();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        // Get all rooms from chat store
        const chatRooms = chatStore.rooms;
        const boardRooms = boardStore.rooms;

        // Combine room IDs from both stores
        const allRoomIds = new Set([
            ...Object.keys(chatRooms),
            ...Object.keys(boardRooms)
        ]);

        const roomInfos: RoomInfo[] = Array.from(allRoomIds).map(roomId => {
            const chatRoom = chatRooms[roomId];
            const boardRoom = boardRooms[roomId];

            const messages = chatRoom?.messages || [];
            const lastMessage = messages.length > 0
                ? messages[messages.length - 1].content?.substring(0, 50)
                : undefined;

            const lastUpdated = Math.max(
                chatRoom?.messages?.[chatRoom.messages.length - 1]?.id
                    ? parseInt(chatRoom.messages[chatRoom.messages.length - 1].id)
                    : 0,
                boardRoom?.lastUpdated || 0
            );

            return {
                id: roomId,
                lastMessage: lastMessage || '(empty)',
                messageCount: messages.length,
                lastUpdated
            };
        });

        // Sort by last updated, newest first
        roomInfos.sort((a, b) => b.lastUpdated - a.lastUpdated);
        setRooms(roomInfos);
    }, [mounted, chatStore.rooms, boardStore.rooms]);

    const handleNewRoom = () => {
        const newRoomId = uuidv4().substring(0, 8);
        router.push(`/room/${newRoomId}`);
    };

    const handleDeleteRoom = (roomId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (confirm('このルームを削除しますか？')) {
            chatStore.clearRoom(roomId);
            boardStore.clearRoom(roomId);
            // Re-fetch rooms
            setRooms(prev => prev.filter(r => r.id !== roomId));
        }
    };

    if (!mounted) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 flex items-center justify-center">
                <div className="text-neutral-400 animate-pulse">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/"
                            className="w-9 h-9 flex items-center justify-center bg-white dark:bg-neutral-800 rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-all"
                            title="トップへ戻る"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                                ルーム一覧
                            </h1>
                            <p className="text-sm text-neutral-500 mt-1">
                                {rooms.length}件のルーム
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleNewRoom}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        新規作成
                    </button>
                </div>

                {/* Room List */}
                {rooms.length === 0 ? (
                    <div className="text-center py-16 text-neutral-400">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>ルームがありません</p>
                        <p className="text-sm mt-2">新しいルームを作成してください</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {rooms.map(room => (
                            <Link
                                key={room.id}
                                href={`/room/${room.id}`}
                                className="block bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all group"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs text-neutral-400 flex items-center gap-1">
                                                <MessageSquare className="w-3 h-3" />
                                                {room.messageCount}件
                                            </span>
                                        </div>
                                        <p className="text-neutral-700 dark:text-neutral-300 truncate">
                                            {room.lastMessage}
                                        </p>
                                        <div className="flex items-center gap-1 mt-2 text-xs text-neutral-400">
                                            <Clock className="w-3 h-3" />
                                            {room.lastUpdated > 0 ? formatDate(room.lastUpdated) : '更新なし'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteRoom(room.id, e)}
                                        className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                        title="削除"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
