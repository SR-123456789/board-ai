import React from 'react';
import { BoardNode } from '@/types/board';
import { cn } from '@/lib/utils';
import { MarkdownContent } from './MarkdownContent';

export const ProblemNode: React.FC<{ node: BoardNode }> = ({ node }) => (
    <div className={cn(
        "p-6 w-full break-words shadow-sm rounded-lg transition-all hover:shadow-md",
        "border-blue-500 border-2 bg-blue-50 dark:bg-blue-950/30"
    )}>
        <div className="font-bold text-blue-700 dark:text-blue-300 mb-2 uppercase text-xs tracking-wider">Problem</div>
        <MarkdownContent content={node.content} />
    </div>
);
