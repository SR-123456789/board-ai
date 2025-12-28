'use client';

import React, { useMemo, useRef, forwardRef, useImperativeHandle, useEffect, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useBoardStore } from '@/hooks/use-board-store';
import { BoardNode } from './BoardNode';
import { SuggestedQuestions } from './SuggestedQuestions';
import { BoardNode as BoardNodeType } from '@/types/board';
import { ChevronUp } from 'lucide-react';

interface BoardCanvasProps {
    suggestedQuestions?: string[];
    onSuggestedQuestionClick?: (question: string) => void;
    isLoading?: boolean;
    onQuizNext?: (isCorrect: boolean) => void;
    currentSectionId?: string; // Currently in-progress section for managed mode
}

export interface BoardCanvasRef {
    scrollToGroup: (turnId: string) => void;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = WEEKDAYS[date.getDay()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}/${day} (${weekday}) ${hours}:${minutes}`;
};

// Group nodes by chatTurnId
const groupNodesByTurn = (nodes: BoardNodeType[]) => {
    const groups: { turnId: string; timestamp?: number; nodes: BoardNodeType[] }[] = [];
    let currentTurnId: string | null = null;
    let currentGroup: BoardNodeType[] = [];
    let currentTimestamp: number | undefined;

    nodes.forEach((node) => {
        const turnId = node.chatTurnId || node.id;
        if (turnId !== currentTurnId) {
            if (currentGroup.length > 0 && currentTurnId) {
                groups.push({ turnId: currentTurnId, timestamp: currentTimestamp, nodes: currentGroup });
            }
            currentTurnId = turnId;
            currentGroup = [node];
            currentTimestamp = node.createdAt;
        } else {
            currentGroup.push(node);
        }
    });

    if (currentGroup.length > 0 && currentTurnId) {
        groups.push({ turnId: currentTurnId, timestamp: currentTimestamp, nodes: currentGroup });
    }

    return groups;
};

export const BoardCanvas = forwardRef<BoardCanvasRef, BoardCanvasProps>(({
    suggestedQuestions = [],
    onSuggestedQuestionClick = () => { },
    isLoading = false,
    onQuizNext,
    currentSectionId
}, ref) => {
    const { getNodes, rooms, currentRoomId } = useBoardStore();
    const [hasScrolled, setHasScrolled] = useState(false);
    // Re-render when rooms or currentRoomId changes
    const nodes = currentRoomId && rooms[currentRoomId] ? rooms[currentRoomId].nodes : [];
    const groupedNodes = useMemo(() => groupNodesByTurn(nodes), [nodes]);
    const groupRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    const scrollToGroup = (turnId: string) => {
        const element = groupRefs.current[turnId];
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Scroll to last group on initial mount
    useEffect(() => {
        if (!hasScrolled && groupedNodes.length > 0) {
            const lastGroup = groupedNodes[groupedNodes.length - 1];
            const element = groupRefs.current[lastGroup.turnId];
            if (element) {
                element.scrollIntoView({ behavior: 'instant', block: 'start' });
                setHasScrolled(true);
            }
        }
    }, [groupedNodes, hasScrolled]);

    // Expose scrollToGroup to parent via ref
    useImperativeHandle(ref, () => ({
        scrollToGroup
    }), []);

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-neutral-950 overflow-y-auto px-2 py-4 md:p-8 custom-scrollbar">
            <div className="max-w-4xl mx-auto flex flex-col gap-3 md:gap-4 pb-20">
                {nodes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] text-neutral-400 dark:text-neutral-500">
                        <p className="text-xl font-medium">Board is empty.</p>
                        <p className="text-sm">Ask a question to start your notebook.</p>
                    </div>
                ) : (
                    <>
                        {groupedNodes.map((group) => (
                            <div
                                key={group.turnId}
                                ref={(el) => { groupRefs.current[group.turnId] = el; }}
                                className="animate-in fade-in slide-in-from-bottom-4 duration-500"
                            >
                                {/* Timeline-style: timestamp with connecting line to content */}
                                <div className="flex gap-3">
                                    {/* Left timeline indicator - clickable */}
                                    <button
                                        onClick={() => scrollToGroup(group.turnId)}
                                        className="group flex flex-col items-center pt-1 cursor-pointer hover:opacity-100 transition-all"
                                        title="クリックでこのセクションの先頭へ"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-500 group-hover:bg-blue-500 group-hover:scale-125 transition-all" />
                                        <div className="w-0.5 flex-1 bg-gradient-to-b from-neutral-300 dark:from-neutral-600 to-transparent group-hover:from-blue-400 transition-all relative">
                                            {/* Hover arrow indicator */}
                                            <ChevronUp className="absolute -left-[7px] top-1 w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </button>
                                    {/* Content with timestamp header */}
                                    <div className="flex-1 pb-2">
                                        <span className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500 block mb-2">
                                            {formatTimestamp(group.timestamp)}
                                        </span>
                                        <div className="flex flex-col gap-4">
                                            {group.nodes.map((node) => (
                                                <BoardNode
                                                    key={node.id}
                                                    node={node}
                                                    onQuizNext={onQuizNext}
                                                    currentSectionId={currentSectionId}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <SuggestedQuestions
                            questions={suggestedQuestions}
                            onQuestionClick={onSuggestedQuestionClick}
                            isLoading={isLoading}
                        />
                    </>
                )}
            </div>
        </div>
    );
});

BoardCanvas.displayName = 'BoardCanvas';
