'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Send, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBoardStore } from '@/hooks/use-board-store';

// Inline simple UI
const TempInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        {...props}
        className={cn(
            "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            props.className
        )}
    />
);
const TempButton = ({ className, size, variant, ...props }: any) => (
    <button
        {...props}
        className={cn(
            "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
            "bg-black dark:bg-white text-white dark:text-black hover:opacity-90 h-10 px-4 py-2",
            className
        )}
    />
);

type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    toolInvocations?: any[];
};

export const ChatPanel = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { addNode, updateNode, removeNode } = useBoardStore();
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content }))
                })
            });

            if (!response.body) throw new Error('No body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiMessageId = (Date.now() + 1).toString();
            let aiContent = "";
            let toolArgs: any = null;

            // Prepare placeholder AI message
            setMessages(prev => [...prev, { id: aiMessageId, role: 'assistant', content: '' }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);

                        if (data.type === 'text') {
                            aiContent += data.content;
                            // Update UI
                            setMessages(prev => prev.map(m =>
                                m.id === aiMessageId ? { ...m, content: aiContent } : m
                            ));
                        } else if (data.type === 'tool_call' && data.toolName === 'generate_response') {
                            toolArgs = data.args;
                            console.log('Tool Args received:', toolArgs);

                            // If comment exists, use it as content
                            if (toolArgs.comment) {
                                aiContent = toolArgs.comment;
                                setMessages(prev => prev.map(m =>
                                    m.id === aiMessageId ? { ...m, content: aiContent } : m
                                ));
                            }

                            // Execute operations immediately
                            if (toolArgs.operations && Array.isArray(toolArgs.operations)) {
                                toolArgs.operations.forEach((op: any) => {
                                    const { action, node } = op;
                                    console.log('Applying op:', action, node);
                                    if (action === 'create') {
                                        addNode({
                                            ...node,
                                            type: node.type || 'text',
                                            content: node.content || '',
                                            position: node.position || { x: 0, y: 0 },
                                            style: node.style,
                                            createdBy: 'ai',
                                        });
                                    } else if (action === 'update') {
                                        if (node.id) updateNode(node.id, node);
                                    } else if (action === 'delete') {
                                        if (node.id) removeNode(node.id);
                                    }
                                });
                            }
                        }
                    } catch (err) {
                        console.error('JSON Parse Error:', err, line);
                    }
                }
            }

        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Connection failed.' }]);
        } finally {
            setIsLoading(false);
        }
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
                {messages.map((m) => (
                    <div
                        key={m.id}
                        className={cn(
                            "flex flex-col max-w-[90%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm",
                            m.role === 'user'
                                ? "ml-auto bg-blue-600 text-white rounded-br-none"
                                : "bg-neutral-100 dark:bg-neutral-800 text-foreground rounded-bl-none border border-neutral-200 dark:border-neutral-700"
                        )}
                    >
                        {m.content || <span className="text-gray-400 italic">(Updated board)</span>}
                    </div>
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
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white/50 backdrop-blur-sm">
                <form onSubmit={handleSend} className="flex gap-2">
                    <TempInput
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question..."
                        className="flex-1"
                    />
                    <TempButton type="submit" size="icon" disabled={isLoading}>
                        <Send className="w-4 h-4" />
                    </TempButton>
                </form>
            </div>
        </div>
    );
};
