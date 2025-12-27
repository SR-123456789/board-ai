import React from 'react';
import { cn } from '@/lib/utils';
import { Message } from '@/hooks/use-chat-stream';
import { ArrowUpLeft } from 'lucide-react';

interface ChatMessageProps {
    message: Message;
    onClick?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onClick }) => {
    const isUser = message.role === 'user';
    const isClickable = !isUser && onClick;

    return (
        <div
            className={cn(
                "flex flex-col max-w-[90%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300",
                isUser
                    ? "ml-auto bg-blue-600 text-white rounded-br-none"
                    : "bg-neutral-100 dark:bg-neutral-800 text-foreground rounded-bl-none border border-neutral-200 dark:border-neutral-700",
                isClickable && "cursor-pointer hover:ring-2 hover:ring-blue-400 hover:ring-offset-2 dark:hover:ring-offset-neutral-900 transition-all group"
            )}
            onClick={onClick}
            title={isClickable ? "クリックでボードの該当箇所へ" : undefined}
        >
            <div className="flex items-start gap-2">
                <span className="flex-1">{message.content || <span className="text-gray-400 italic">(Writing on board...)</span>}</span>
                {isClickable && (
                    <ArrowUpLeft className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                )}
            </div>
        </div>
    );
};
