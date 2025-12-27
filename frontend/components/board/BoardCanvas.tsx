'use client';

import React, { useMemo } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useBoardStore } from '@/hooks/use-board-store';
import { BoardNode } from './BoardNode';
import { SuggestedQuestions } from './SuggestedQuestions';
import { BoardNode as BoardNodeType } from '@/types/board';

interface BoardCanvasProps {
    suggestedQuestions?: string[];
    onSuggestedQuestionClick?: (question: string) => void;
    isLoading?: boolean;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const weekday = WEEKDAYS[date.getDay()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${weekday} ${hours}:${minutes}`;
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

export const BoardCanvas: React.FC<BoardCanvasProps> = ({
    suggestedQuestions = [],
    onSuggestedQuestionClick = () => { },
    isLoading = false
}) => {
    const { nodes } = useBoardStore();
    const groupedNodes = useMemo(() => groupNodesByTurn(nodes), [nodes]);

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-neutral-950 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-4xl mx-auto flex flex-col gap-4 pb-20">
                {nodes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] text-neutral-400 dark:text-neutral-500">
                        <p className="text-xl font-medium">Board is empty.</p>
                        <p className="text-sm">Ask a question to start your notebook.</p>
                    </div>
                ) : (
                    <>
                        {groupedNodes.map((group) => (
                            <div key={group.turnId} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Chat turn timestamp - compact horizontal line with time */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent" />
                                    <span className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500 tracking-wide">
                                        {formatTimestamp(group.timestamp)}
                                    </span>
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent" />
                                </div>
                                {/* Nodes in this turn */}
                                <div className="flex flex-col gap-4">
                                    {group.nodes.map((node) => (
                                        <BoardNode key={node.id} node={node} />
                                    ))}
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
};
