'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserMenu } from '@/components/UserMenu';
import { useChatStore, RoomMode } from '@/hooks/use-chat-store';
import { useBoardStore } from '@/hooks/use-board-store';
import { useManagedStore } from '@/hooks/use-managed-store';
import { Plus, MessageSquare, Clock, Trash2, ArrowLeft, X, BookOpen, Sparkles } from 'lucide-react';
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
    mode?: RoomMode;
}

export default function RoomListPage() {
    const [mounted, setMounted] = useState(false);
    const [rooms, setRooms] = useState<RoomInfo[]>([]);
    const [showModeDialog, setShowModeDialog] = useState(false);
    const router = useRouter();
    const chatStore = useChatStore();
    const boardStore = useBoardStore();
    const managedStore = useManagedStore();

    useEffect(() => {
        setMounted(true);
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            const res = await fetch('/api/rooms');
            if (res.ok) {
                const data = await res.json();
                interface ApiRoom {
                    id: string;
                    messages?: Array<{ content: string }>;
                    updatedAt: string;
                    managedState?: unknown;
                }

                const apiRooms = (data.rooms || []).map((room: ApiRoom) => ({
                    id: room.id,
                    lastMessage: room.messages?.[room.messages.length - 1]?.content.substring(0, 60) || 'メッセージなし',
                    messageCount: room.messages?.length || 0,
                    lastUpdated: new Date(room.updatedAt).getTime(),
                    mode: room.managedState ? 'managed' : 'normal'
                }));
                setRooms(apiRooms.sort((a: RoomInfo, b: RoomInfo) => b.lastUpdated - a.lastUpdated));
            }
        } catch (e) {
            console.error("Failed to fetch rooms", e);
        }
    };

    const handleCreateRoom = (mode: RoomMode) => {
        const newRoomId = uuidv4().substring(0, 8);

        // Set mode for the new room
        chatStore.setCurrentRoom(newRoomId);
        chatStore.setMode(newRoomId, mode);

        if (mode === 'managed') {
            managedStore.initializeRoom(newRoomId);
        }

        setShowModeDialog(false);
        router.push(`/room/${newRoomId}`);
    };

    const handleDeleteRoom = (roomId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (confirm('このルームを削除しますか？')) {
            chatStore.clearRoom(roomId);
            boardStore.clearRoom(roomId);
            managedStore.clearRoom(roomId);
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
        <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 md:mb-8">
                    <div className="flex items-center gap-3 md:gap-4">
                        <Link
                            href="/"
                            className="w-9 h-9 flex items-center justify-center bg-white dark:bg-neutral-800 rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-all"
                            title="トップへ戻る"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-white">
                                ルーム一覧
                            </h1>
                            <p className="text-xs md:text-sm text-neutral-500 mt-1">
                                {rooms.length}件のルーム
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <UserMenu />
                        <button
                            onClick={() => setShowModeDialog(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            新規作成
                        </button>
                    </div>
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
                                            {room.mode === 'managed' ? (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                                    MANAGED
                                                </span>
                                            ) : (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                    NORMAL
                                                </span>
                                            )}
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

            {/* Mode Selection Dialog */}
            {showModeDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full shadow-2xl">
                        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">モードを選択</h2>
                            <button
                                onClick={() => setShowModeDialog(false)}
                                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-neutral-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Normal Mode */}
                            <button
                                onClick={() => handleCreateRoom('normal')}
                                className="w-full p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                                        <Sparkles className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-neutral-900 dark:text-white mb-1">通常モード</h3>
                                        <p className="text-sm text-neutral-500 leading-relaxed">
                                            質問に対してAIがホワイトボードを用いて解説します。
                                        </p>
                                    </div>
                                </div>
                            </button>

                            {/* Managed Teacher Mode */}
                            <button
                                onClick={() => handleCreateRoom('managed')}
                                className="w-full p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all text-left group"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                                        <BookOpen className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-neutral-900 dark:text-white mb-1">家庭教師モード</h3>
                                        <p className="text-sm text-neutral-500 leading-relaxed">
                                            目標を聞き、ロードマップを作成し、ロードマップに沿って解説します。
                                        </p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
