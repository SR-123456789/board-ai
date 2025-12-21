import React from 'react';
import { BoardNode } from '@/types/board';
import { cn } from '@/lib/utils';
import { MarkdownContent } from './MarkdownContent';

export const StickyNode: React.FC<{ node: BoardNode }> = ({ node }) => (
    <div
        className={cn(
            "p-6 w-full break-words shadow-sm rounded-lg transition-all hover:shadow-md",
            "bg-yellow-100 dark:bg-yellow-900/50 shadow-md transform rotate-1 border-l-4 border-yellow-400 font-handwriting min-w-[200px]",
            node.style?.color && `text-[${node.style.color}]`
        )}
        style={{ backgroundColor: node.style?.backgroundColor }}
    >
        <MarkdownContent content={node.content} />
    </div>
);
