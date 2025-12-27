'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { BoardCanvas, BoardCanvasRef } from '@/components/board/BoardCanvas';
import { ChatPanel, ChatPanelRef } from '@/components/chat/ChatPanel';
import { SelectionPopup } from '@/components/board/SelectionPopup';
import { useBoardStore } from '@/hooks/use-board-store';
import { useChatStream } from '@/hooks/use-chat-stream';
import { useChatStore } from '@/hooks/use-chat-store';
import { useParams } from 'next/navigation';

export default function RoomPage() {
    const [mounted, setMounted] = useState(false);
    const { setCurrentRoom: setBoardRoom } = useBoardStore();
    const { setCurrentRoom: setChatRoom } = useChatStore();
    const params = useParams();
    const roomId = params.roomId as string;
    const { messages, isLoading, suggestedQuestions, sendMessage } = useChatStream();
    const boardRef = useRef<BoardCanvasRef>(null);
    const chatPanelRef = useRef<ChatPanelRef>(null);

    // Handle hydration - only render content after mount
    useEffect(() => {
        setMounted(true);
    }, []);

    // Set current room for both stores when entering
    useEffect(() => {
        if (roomId && mounted) {
            setBoardRoom(roomId);
            setChatRoom(roomId);
        }
    }, [roomId, mounted, setBoardRoom, setChatRoom]);

    const handleSuggestedQuestionClick = (question: string) => {
        sendMessage(question);
    };

    const handleMessageClick = useCallback((chatTurnId: string) => {
        boardRef.current?.scrollToGroup(chatTurnId);
    }, []);

    // Handle text selection actions
    const handleAskAboutText = useCallback((text: string) => {
        sendMessage(`${text}について教えて`);
    }, [sendMessage]);

    const handleInsertToChat = useCallback((text: string) => {
        chatPanelRef.current?.setInputValue(text);
    }, []);

    // Prevent hydration mismatch by showing loading state until mounted
    if (!mounted) {
        return (
            <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-neutral-950">
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-neutral-400 animate-pulse">Loading...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-screen overflow-hidden">
            {/* Selection Popup for text actions */}
            <SelectionPopup onAsk={handleAskAboutText} onInsert={handleInsertToChat} />

            {/* Left: Board (takes remaining space) */}
            <div className="flex-1 relative">
                <BoardCanvas
                    ref={boardRef}
                    suggestedQuestions={suggestedQuestions}
                    onSuggestedQuestionClick={handleSuggestedQuestionClick}
                    isLoading={isLoading}
                />
            </div>

            {/* Right: Chat Panel (fixed width for now, or resizable) */}
            <div className="w-[400px] h-full shrink-0 shadow-xl z-10 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                <ChatPanel
                    ref={chatPanelRef}
                    messages={messages}
                    isLoading={isLoading}
                    onSend={sendMessage}
                    onMessageClick={handleMessageClick}
                />
            </div>
        </div>
    );
}
