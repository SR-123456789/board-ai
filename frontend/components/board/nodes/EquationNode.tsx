import React from 'react';
import { BoardNode } from '@/types/board';
import { cn } from '@/lib/utils';

export const EquationNode: React.FC<{ node: BoardNode }> = ({ node }) => (
    <div className={cn(
        "p-6 w-full break-words shadow-sm rounded-lg transition-all hover:shadow-md",
        "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
    )}>
        <div className="font-mono text-center py-2 text-lg">
            $$ {node.content} $$
        </div>
    </div>
);
