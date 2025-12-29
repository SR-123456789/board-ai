import { useState } from 'react';
import { useBoardStore } from './use-board-store';
import { useChatStore, Message } from './use-chat-store';
import { createClient } from '@/utils/supabase/client';
import { useRouter, usePathname } from 'next/navigation';

// Re-export Message type for compatibility
export type { Message } from './use-chat-store';

// Helper to upload file and get URI
async function uploadFile(file: File): Promise<{ fileData: { fileUri: string; mimeType: string } }> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
        fileData: {
            fileUri: data.fileUri,
            mimeType: data.mimeType,
        }
    };
}

export const useChatStream = () => {
    const [isLoading, setIsLoading] = useState(false);
    const { addNode, updateNode, removeNode } = useBoardStore();
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();
    const {
        getMessages,
        addMessage,
        updateMessage,
        getSuggestedQuestions,
        setSuggestedQuestions
    } = useChatStore();

    const messages = getMessages();
    const suggestedQuestions = getSuggestedQuestions();

    const sendMessage = async (input: string, files: File[] = []) => {
        if ((!input.trim() && files.length === 0) || isLoading) return;

        // AUTH CHECK
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            // Save draft to localStorage to restore after login
            localStorage.setItem('pendingMessage', JSON.stringify({
                input,
                // Note: File objects cannot be saved to localStorage easily.
                // For MVP, we might warn user or try to upload first?
                // Uploading requires auth? Currently /api/upload might be protected?
                // If /api/upload is protected, we can't upload.
                // Let's just save text for now and maybe alert user if files dropped.
                hasFiles: files.length > 0
            }));

            // Redirect to login with proper return URL
            router.push(`/login?next=${pathname}`);
            return;
        }

        setIsLoading(true);
        setSuggestedQuestions([]); // Clear previous suggestions

        // Generate a unique ID for this chat turn
        const chatTurnId = Date.now().toString();

        const id = chatTurnId;
        let userMessage: Message = {
            id,
            role: 'user',
            content: input
        };

        try {
            // Process files if any
            if (files.length > 0) {
                const fileParts = await Promise.all(
                    files.map(file => uploadFile(file))
                );
                userMessage.parts = [
                    ...fileParts,
                    { text: input }
                ];
            }

            addMessage(userMessage);

            const currentMessages = getMessages();
            // We need to pass roomId to the API. 
            // Currently useChatStore has currentRoomId? 
            // Or we check URL? usage of useChatStore implies it manages active room.
            const roomId = useChatStore.getState().currentRoomId;

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId: roomId, // Pass roomId for creation/persistence
                    messages: currentMessages.map(m => {
                        if (m.parts) {
                            return { role: m.role, parts: m.parts };
                        }
                        return { role: m.role, content: m.content };
                    })
                })
            });

            if (!response.body) throw new Error('No body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiMessageId = (Date.now() + 1).toString();
            let aiContent = "";
            let toolArgs: any = null;

            // Add placeholder AI message
            addMessage({ id: aiMessageId, role: 'assistant', content: '', chatTurnId: chatTurnId });

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
                            updateMessage(aiMessageId, { content: aiContent });
                        } else if (data.type === 'tool_call' && data.toolName === 'generate_response') {
                            toolArgs = data.args;

                            if (toolArgs.comment) {
                                aiContent = toolArgs.comment;
                                updateMessage(aiMessageId, { content: aiContent });
                            }

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
                                            chatTurnId: chatTurnId,
                                        });
                                    } else if (action === 'update') {
                                        if (node.id) updateNode(node.id, node);
                                    } else if (action === 'delete') {
                                        if (node.id) removeNode(node.id);
                                    }
                                });
                            }

                            if (toolArgs.suggestedQuestions && Array.isArray(toolArgs.suggestedQuestions)) {
                                setSuggestedQuestions(toolArgs.suggestedQuestions);
                            }
                        }
                    } catch (err) {
                        console.error('JSON Parse Error:', err, line);
                    }
                }
            }

        } catch (error) {
            console.error('Chat error:', error);
            addMessage({ id: Date.now().toString(), role: 'assistant', content: 'Connection failed.' });
        } finally {
            setIsLoading(false);
        }
    };

    return {
        messages,
        isLoading,
        suggestedQuestions,
        sendMessage
    };
};
