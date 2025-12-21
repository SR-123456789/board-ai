import React from 'react';
import { cn } from '@/lib/utils';
import { Message } from '@/hooks/use-chat-stream';

interface ChatMessageProps {
    message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
    const isUser = message.role === 'user';

    return (
        <div
            className={cn(
                "flex flex-col max-w-[90%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300",
                isUser
                    ? "ml-auto bg-blue-600 text-white rounded-br-none"
                    : "bg-neutral-100 dark:bg-neutral-800 text-foreground rounded-bl-none border border-neutral-200 dark:border-neutral-700"
            )}
        >
            {message.content || <span className="text-gray-400 italic">(Writing on board...)</span>}
        </div>
    );
};
