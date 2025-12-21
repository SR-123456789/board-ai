import { useState, useRef } from 'react';
import { useBoardStore } from './use-board-store';

export type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
};

export const useChatStream = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { addNode, updateNode, removeNode } = useBoardStore();

    const sendMessage = async (input: string) => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input
        };

        setMessages(prev => [...prev, userMessage]);
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
                                    if (action === 'create') {
                                        addNode({
                                            ...node,
                                            type: node.type || 'text',
                                            content: node.content || '',
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

    return {
        messages,
        isLoading,
        sendMessage
    };
};
