import React from 'react';
import { BoardNode as BoardNodeType } from '@/types/board';
import { TextNode } from './nodes/TextNode';
import { StickyNode } from './nodes/StickyNode';
import { EquationNode } from './nodes/EquationNode';
import { ProblemNode } from './nodes/ProblemNode';

interface BoardNodeProps {
    node: BoardNodeType;
}

export const BoardNode: React.FC<BoardNodeProps> = ({ node }) => {
    switch (node.type) {
        case 'sticky':
            return <StickyNode node={node} />;
        case 'equation':
            return <EquationNode node={node} />;
        case 'problem':
            return <ProblemNode node={node} />;
        case 'text':
        default:
            return <TextNode node={node} />;
    }
};
