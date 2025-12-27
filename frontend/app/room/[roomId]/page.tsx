'use client';

import { useEffect } from 'react';
import { BoardCanvas } from '@/components/board/BoardCanvas';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { useBoardStore } from '@/hooks/use-board-store';
import { useChatStream } from '@/hooks/use-chat-stream';
import { useParams } from 'next/navigation';

export default function RoomPage() {
    const { reset } = useBoardStore();
    const params = useParams();
    const { messages, isLoading, suggestedQuestions, sendMessage } = useChatStream();

    // Reset board state when entering a new room
    useEffect(() => {
        reset();
    }, [reset, params.roomId]);

    const handleSuggestedQuestionClick = (question: string) => {
        sendMessage(question);
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden">
            {/* Left: Board (takes remaining space) */}
            <div className="flex-1 relative">
                <BoardCanvas
                    suggestedQuestions={suggestedQuestions}
                    onSuggestedQuestionClick={handleSuggestedQuestionClick}
                    isLoading={isLoading}
                />
            </div>

            {/* Right: Chat Panel (fixed width for now, or resizable) */}
            <div className="w-[400px] h-full shrink-0 shadow-xl z-10 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                <ChatPanel
                    messages={messages}
                    isLoading={isLoading}
                    onSend={sendMessage}
                />
            </div>
        </div>
    );
}
