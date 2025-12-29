'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import Link from 'next/link';
import { BoardCanvas, BoardCanvasRef } from '@/components/board/BoardCanvas';
import { ChatPanel, ChatPanelRef } from '@/components/chat/ChatPanel';
import { SelectionPopup } from '@/components/board/SelectionPopup';
import { useBoardStore } from '@/hooks/use-board-store';
import { useChatStream } from '@/hooks/use-chat-stream';
import { useChatStore } from '@/hooks/use-chat-store';
import { useManagedChat } from '@/hooks/use-managed-chat';
import { useManagedStore } from '@/hooks/use-managed-store';
import { useParams } from 'next/navigation';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function RoomPage() {
    const [mounted, setMounted] = useState(false);
    const [initialMessageSent, setInitialMessageSent] = useState(false);
    const [mobileTab, setMobileTab] = useState<'chat' | 'board'>('board'); // Mobile: board is main view
    const { setCurrentRoom: setBoardRoom } = useBoardStore();
    const { setCurrentRoom: setChatRoom, getMode, addMessage } = useChatStore();
    const params = useParams();
    const roomId = params.roomId as string;

    // Get hooks - use appropriate one based on mode
    const mode = useChatStore((s) => s.rooms[roomId]?.mode) || 'normal';
    const normalChat = useChatStream();
    const managedChat = useManagedChat(roomId);
    const managedState = useManagedStore((s) => s.rooms[roomId]);

    // Select the right hook based on mode
    const messages = normalChat.messages;
    const isLoading = mode === 'managed' ? managedChat.isLoading : normalChat.isLoading;
    const suggestedQuestions = normalChat.suggestedQuestions;
    const sendMessage = mode === 'managed' ? managedChat.sendMessage : normalChat.sendMessage;

    // Handler for quiz "Next" button
    const handleQuizNext = useCallback((isCorrect: boolean) => {
        if (mode === 'managed') {
            managedChat.proceedToNextSection(isCorrect);
        }
    }, [mode, managedChat]);

    // Get current section ID for managed mode
    const currentSectionId = useMemo(() => {
        if (mode !== 'managed' || !managedState?.roadmap) return undefined;
        const unit = managedState.roadmap.units[managedState.currentUnitIndex];
        const section = unit?.sections[managedState.currentSectionIndex];
        return section?.id;
    }, [mode, managedState]);

    const boardRef = useRef<BoardCanvasRef>(null);
    const chatPanelRef = useRef<ChatPanelRef>(null);

    // Handle hydration - only render content after mount
    useEffect(() => {
        setMounted(true);
    }, []);

    // Set up rooms
    useEffect(() => {
        if (roomId) {
            setBoardRoom(roomId);
            setChatRoom(roomId);
        }
    }, [roomId, setBoardRoom, setChatRoom]);

    // Auto-close chat when board gets new content (mobile)
    const boardNodeCount = useBoardStore((s) => s.rooms[roomId]?.nodes?.length ?? 0);
    const prevNodeCount = useRef(boardNodeCount);
    useEffect(() => {
        if (boardNodeCount > prevNodeCount.current) {
            // New content added to board - close chat on mobile
            setMobileTab('board');
        }
        prevNodeCount.current = boardNodeCount;
    }, [boardNodeCount]);

    // Send initial message for managed mode
    useEffect(() => {
        if (!mounted || !roomId || initialMessageSent) return;
        if (mode === 'managed') {
            const existingMessages = useChatStore.getState().rooms[roomId]?.messages || [];
            if (existingMessages.length === 0) {
                addMessage({
                    id: 'initial-greeting',
                    role: 'assistant',
                    content: '👋 こんにちは！学習を始めましょう。\n\nまず、今回学びたいテーマについて、あなたの**現在のレベル**を教えてください。\n\n例：「プログラミングは初めて」「基本的なHTML/CSSは分かる」など',
                });
            }
            setInitialMessageSent(true);
        }
    }, [mounted, roomId, mode, initialMessageSent, addMessage]);

    // Verify login via Supabase client to ensure we have a session
    const [user, setUser] = useState<any>(null);
    useEffect(() => {
        const supabase = createClient();
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        checkUser();
    }, []);

    // Sending pending message if any (Guest -> Login -> Auto Send)
    useEffect(() => {
        const sendPending = async () => {
            if (!mounted || !user) return; // Wait for mount and user check

            const pending = localStorage.getItem('pendingMessage');
            if (pending) {
                try {
                    const { input } = JSON.parse(pending);
                    if (input && sendMessage) {
                        // Clear immediate to prevent loop if error
                        localStorage.removeItem('pendingMessage');
                        await sendMessage(input);
                    }
                } catch (e) {
                    console.error("Failed to parse pending message", e);
                    localStorage.removeItem('pendingMessage');
                }
            }
        };
        sendPending();
    }, [mounted, user, sendMessage]);

    // Update page title with last AI message
    useEffect(() => {
        if (!mounted) return;

        const lastAiMessage = [...messages].reverse().find(m => m.role === 'assistant' && m.content);
        if (lastAiMessage?.content) {
            const title = lastAiMessage.content.substring(0, 50) + (lastAiMessage.content.length > 50 ? '...' : '');
            document.title = `${title} | Board AI`;
        } else {
            document.title = 'Board AI';
        }
    }, [messages, mounted]);

    const handleSuggestedQuestionClick = useCallback((question: string) => {
        chatPanelRef.current?.triggerSend(question);
        // On mobile, switch to chat tab
        setMobileTab('chat');
    }, []);

    const handleMessageClick = useCallback((chatTurnId: string) => {
        if (chatTurnId && boardRef.current) {
            boardRef.current.scrollToGroup(chatTurnId);
            // On mobile, switch to board tab when clicking a message
            setMobileTab('board');
        }
    }, []);

    // Handle text selection actions
    const handleAskAboutText = useCallback((text: string) => {
        chatPanelRef.current?.triggerSend(`「${text}」について教えてください`);
        setMobileTab('chat');
    }, []);

    const handleInsertToChat = useCallback((text: string) => {
        chatPanelRef.current?.setInputValue(text);
        setMobileTab('chat');
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
        <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden">
            {/* Selection Popup for text actions (desktop only) */}
            <div className="hidden md:block">
                <SelectionPopup onAsk={handleAskAboutText} onInsert={handleInsertToChat} />
            </div>

            {/* Desktop Layout: Side by side */}
            {/* Left: Board (takes remaining space) - hidden on mobile */}
            <div className="hidden md:block flex-1 relative">
                {/* Back Button */}
                <Link
                    href="/room"
                    className="absolute top-4 left-4 z-20 w-9 h-9 flex items-center justify-center bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white dark:hover:bg-neutral-800 transition-all shadow-sm"
                    title="ルーム一覧へ戻る"
                >
                    <ArrowLeft className="w-4 h-4" />
                </Link>

                <BoardCanvas
                    ref={boardRef}
                    suggestedQuestions={suggestedQuestions}
                    onSuggestedQuestionClick={handleSuggestedQuestionClick}
                    isLoading={isLoading}
                    onQuizNext={handleQuizNext}
                    currentSectionId={currentSectionId}
                />
            </div>

            {/* Right: Chat Panel (fixed width) - hidden on mobile */}
            <div className="hidden md:block w-[400px] h-full shrink-0 shadow-xl z-10 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                <ChatPanel
                    ref={chatPanelRef}
                    messages={messages}
                    isLoading={isLoading}
                    onSend={sendMessage}
                    onMessageClick={handleMessageClick}
                    roomId={roomId}
                />
            </div>

            {/* Mobile Layout: Board main + Bottom Sheet Chat */}
            <div className="md:hidden flex flex-col h-full w-full relative">
                {/* Mobile Header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800 z-20">
                    <Link
                        href="/room"
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <span className="font-medium text-sm flex-1">
                        {mode === 'managed' ? '📚 学習モード' : '💬 チャット'}
                    </span>
                </div>

                {/* Main Content: Board */}
                <div className="flex-1 overflow-hidden">
                    <BoardCanvas
                        ref={boardRef}
                        suggestedQuestions={suggestedQuestions}
                        onSuggestedQuestionClick={handleSuggestedQuestionClick}
                        isLoading={isLoading}
                        onQuizNext={handleQuizNext}
                        currentSectionId={currentSectionId}
                    />
                </div>

                {/* Bottom Sheet Chat */}
                <div
                    className={`absolute bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 rounded-t-2xl shadow-2xl transition-all duration-300 ease-out z-30 ${mobileTab === 'chat'
                        ? 'h-[85vh]'
                        : 'h-11'
                        }`}
                >
                    {/* Handle Bar - compact */}
                    <button
                        onClick={() => setMobileTab(mobileTab === 'chat' ? 'board' : 'chat')}
                        className="w-full h-11 flex items-center justify-center gap-2 border-b border-neutral-200 dark:border-neutral-800"
                    >
                        <div className="w-8 h-1 bg-neutral-300 dark:bg-neutral-600 rounded-full" />
                        {mobileTab !== 'chat' && (
                            <>
                                <MessageSquare className="w-4 h-4 text-neutral-400" />
                                {messages.length > 0 && (
                                    <span className="px-1.5 py-0.5 bg-blue-500 text-white text-[10px] rounded-full">
                                        {messages.length}
                                    </span>
                                )}
                            </>
                        )}
                    </button>

                    {/* Chat Content */}
                    <div className={`h-[calc(100%-44px)] ${mobileTab === 'chat' ? 'block' : 'hidden'}`}>
                        <ChatPanel
                            ref={chatPanelRef}
                            messages={messages}
                            isLoading={isLoading}
                            onSend={sendMessage}
                            onMessageClick={handleMessageClick}
                            roomId={roomId}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

