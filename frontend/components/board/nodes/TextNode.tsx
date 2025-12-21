import React from 'react';
import { BoardNode } from '@/types/board';
import { cn } from '@/lib/utils';
import { MarkdownContent } from './MarkdownContent';

export const TextNode: React.FC<{ node: BoardNode }> = ({ node }) => (
    <div className={cn(
        "p-6 w-full break-words shadow-sm rounded-lg transition-all hover:shadow-md",
        "bg-white/80 dark:bg-black/50 backdrop-blur-sm border border-neutral-200 dark:border-neutral-800"
    )}>
        <MarkdownContent content={node.content} />
    </div>
);
