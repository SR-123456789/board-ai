import React from 'react';
import { BoardNode as BoardNodeType } from '@/types/board';
import { TextNode } from './nodes/TextNode';
import { StickyNode } from './nodes/StickyNode';
import { EquationNode } from './nodes/EquationNode';
import { ProblemNode } from './nodes/ProblemNode';
import { QuizNode } from './nodes/QuizNode';

interface BoardNodeProps {
    node: BoardNodeType;
    onQuizNext?: (isCorrect: boolean) => void;
    currentSectionId?: string; // Currently in-progress section ID
}

export const BoardNode: React.FC<BoardNodeProps> = ({ node, onQuizNext, currentSectionId }) => {
    switch (node.type) {
        case 'sticky':
            return <StickyNode node={node} />;
        case 'equation':
            return <EquationNode node={node} />;
        case 'problem':
            return <ProblemNode node={node} />;
        case 'quiz':
            // Only show "Next" button if this quiz belongs to the current in-progress section
            const isCurrentSection = !currentSectionId || node.sectionId === currentSectionId;
            return node.quizData ? (
                <QuizNode
                    question={node.quizData}
                    onNext={isCurrentSection ? onQuizNext : undefined}
                />
            ) : null;
        case 'text':
        default:
            return <TextNode node={node} />;
    }
};
