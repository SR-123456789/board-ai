import React from 'react';
import { BoardNode } from '@/types/board';
import { cn } from '@/lib/utils';
import { MarkdownContent } from './MarkdownContent';

export const StickyNode: React.FC<{ node: BoardNode }> = ({ node }) => (
    <div
        className={cn(
            "p-6 w-full break-words shadow-sm rounded-lg transition-all hover:shadow-md",
            "bg-amber-50 dark:bg-amber-100 shadow-md border-l-4 border-amber-400 font-handwriting min-w-[200px]",
            // Warm brown text for readability on amber background
            "text-amber-900 [&_.prose]:text-amber-900 [&_.prose_*]:text-amber-800 [&_.prose_strong]:text-amber-950",
            node.style?.color && `text-[${node.style.color}]`
        )}
        style={{ backgroundColor: node.style?.backgroundColor }}
    >
        <MarkdownContent content={node.content} />
    </div>
);
