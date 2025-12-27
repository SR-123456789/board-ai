'use client';

import React from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useBoardStore } from '@/hooks/use-board-store';
import { BoardNode } from './BoardNode';
import { SuggestedQuestions } from './SuggestedQuestions';

interface BoardCanvasProps {
    suggestedQuestions?: string[];
    onSuggestedQuestionClick?: (question: string) => void;
    isLoading?: boolean;
}

export const BoardCanvas: React.FC<BoardCanvasProps> = ({
    suggestedQuestions = [],
    onSuggestedQuestionClick = () => { },
    isLoading = false
}) => {
    const { nodes } = useBoardStore();

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-neutral-950 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-20">
                {nodes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] text-neutral-400 dark:text-neutral-500">
                        <p className="text-xl font-medium">Board is empty.</p>
                        <p className="text-sm">Ask a question to start your notebook.</p>
                    </div>
                ) : (
                    <>
                        {nodes.map((node) => (
                            <div key={node.id} className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <BoardNode node={node} />
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
