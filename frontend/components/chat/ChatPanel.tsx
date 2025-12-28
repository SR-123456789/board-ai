'use client';

import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Sparkles, BookOpen } from 'lucide-react';
import { Message } from '@/hooks/use-chat-stream';
import { ChatMessage } from './ChatMessage';
import { ChatInput, ChatInputRef } from './MultimediaChatInput';
import { RoadmapPanel } from './RoadmapPanel';
import { useChatStore } from '@/hooks/use-chat-store';

interface ChatPanelProps {
    messages: Message[];
    isLoading: boolean;
    onSend: (input: string, files?: File[]) => void;
    onMessageClick?: (chatTurnId: string) => void;
    roomId?: string;
}

export interface ChatPanelRef {
    setInputValue: (value: string) => void;
}

export const ChatPanel = forwardRef<ChatPanelRef, ChatPanelProps>(({
    messages,
    isLoading,
    onSend,
    onMessageClick,
    roomId
}, ref) => {
    const bottomRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<ChatInputRef>(null);
    const mode = useChatStore((s) => roomId ? s.rooms[roomId]?.mode : 'normal') || 'normal';

    useImperativeHandle(ref, () => ({
        setInputValue: (value: string) => {
            chatInputRef.current?.setInputValue(value);
        }
    }), []);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (content: string, files: File[]) => {
        onSend(content, files);
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 font-sans">
            {/* Header */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
                {mode === 'managed' ? (
                    <BookOpen className="w-5 h-5 text-purple-500" />
                ) : (
                    <Sparkles className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                )}
                <h2 className="font-semibold text-lg tracking-tight">
                    {mode === 'managed' ? 'Managed Teacher' : 'Board AI'}
                </h2>
                {mode === 'managed' && (
                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs rounded-full font-medium">
                        学習モード
                    </span>
                )}
                <div className="ml-auto text-xs text-neutral-400">v1.0</div>
            </div>

            {/* Roadmap Panel (only for managed mode) */}
            {mode === 'managed' && roomId && (
                <RoadmapPanel roomId={roomId} />
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {messages.length === 0 && (
                    <div className="text-center text-neutral-400 mt-10 text-sm">
                        {mode === 'managed' ? (
                            <p>学習を始めましょう！まずは学びたいテーマを教えてください。</p>
                        ) : (
                            <p>Ask a question or upload an image to get started.</p>
                        )}
                    </div>
                )}
                {messages.map((m) => (
                    <ChatMessage
                        key={m.id}
                        message={m}
                        onClick={m.role === 'assistant' && m.chatTurnId ? () => onMessageClick?.(m.chatTurnId!) : undefined}
                    />
                ))}
                {isLoading && (
                    <div className="flex items-center gap-2 text-neutral-400 text-xs ml-4">
                        <div className="animate-bounce">●</div>
                        <div className="animate-bounce delay-75">●</div>
                        <div className="animate-bounce delay-150">●</div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <ChatInput ref={chatInputRef} onSend={handleSend} isLoading={isLoading} />
        </div>
    );
});

ChatPanel.displayName = 'ChatPanel';

