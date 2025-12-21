import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
    onSend: (message: string) => void;
    isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading }) => {
    const [input, setInput] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        onSend(input);
        setInput('');
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white/50 backdrop-blur-sm">
            <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background",
                    "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50"
                )}
                disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                <Send className="w-4 h-4" />
            </Button>
        </form>
    );
};
