'use client';

import React, { useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { useChatStream } from '@/hooks/use-chat-stream';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './MultimediaChatInput';

export const ChatPanel = () => {
    const { messages, isLoading, sendMessage } = useChatStream();
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (content: string, files: File[]) => {
        sendMessage(content, files);
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 font-sans">
            {/* Header */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <h2 className="font-semibold text-lg tracking-tight">Board AI</h2>
                <div className="ml-auto text-xs text-neutral-400">v1.0 (Google SDK)</div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {messages.length === 0 && (
                    <div className="text-center text-neutral-400 mt-10 text-sm">
                        <p>Ask a question or upload an image to get started.</p>
                    </div>
                )}
                {messages.map((m) => (
                    <ChatMessage key={m.id} message={m} />
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
            <ChatInput onSend={handleSend} isLoading={isLoading} />
        </div>
    );
};
