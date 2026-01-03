import React from 'react';
import { BoardNode } from '@/types/board';
import { cn } from '@/lib/utils';
import { MarkdownContent } from './MarkdownContent';

import { useBoardStore } from '@/hooks/use-board-store';

export const TextNode: React.FC<{ node: BoardNode }> = ({ node }) => {
    const updateNode = useBoardStore((state) => state.updateNode);

    return (
        <div className={cn(
            "p-6 w-full break-words shadow-sm rounded-lg transition-all hover:shadow-md",
            "bg-white/80 dark:bg-black/50 backdrop-blur-sm border border-neutral-200 dark:border-neutral-800"
        )}>
            <MarkdownContent 
                content={node.content} 
                onUpdate={(newContent: string) => updateNode(node.id, { content: newContent })}
            />
        </div>
    );
};
