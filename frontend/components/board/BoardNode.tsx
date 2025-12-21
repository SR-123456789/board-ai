import React from 'react';
import { BoardNode as BoardNodeType } from '@/types/board';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Quick inline Card components
const SimpleCard = ({ className, children }: { className?: string, children: React.ReactNode }) => (
    <div className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}>
        {children}
    </div>
);

interface BoardNodeProps {
    node: BoardNodeType;
}

export const BoardNode: React.FC<BoardNodeProps> = ({ node }) => {
    const { type, content, style } = node;

    const baseClasses = "p-6 w-full break-words shadow-sm rounded-lg transition-all hover:shadow-md";

    // Common Markdown Renderer
    const MarkdownContent = () => (
        <div className="prose dark:prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:my-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
            </ReactMarkdown>
        </div>
    );

    switch (type) {
        case 'sticky':
            return (
                <div
                    className={cn(
                        baseClasses,
                        "bg-yellow-100 dark:bg-yellow-900/50 shadow-md transform rotate-1 border-l-4 border-yellow-400 font-handwriting min-w-[200px]",
                        style?.color && `text-[${style.color}]`
                    )}
                    style={{ backgroundColor: style?.backgroundColor }}
                >
                    <MarkdownContent />
                </div>
            );
        case 'equation':
            return (
                <SimpleCard className={cn(baseClasses, "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800")}>
                    <div className="font-mono text-center py-2 text-lg">
                        {/* Placeholder for KaTeX - if user types in $$ ... $$ markdown can handle it via specific plugins but for now raw */}
                        $$ {content} $$
                    </div>
                </SimpleCard>
            );
        case 'problem':
            return (
                <SimpleCard className={cn(baseClasses, "border-blue-500 border-2 bg-blue-50 dark:bg-blue-950/30")}>
                    <div className="font-bold text-blue-700 dark:text-blue-300 mb-2 uppercase text-xs tracking-wider">Problem</div>
                    <MarkdownContent />
                </SimpleCard>
            );
        case 'text':
        default:
            return (
                <div className={cn(baseClasses, "bg-white/80 dark:bg-black/50 backdrop-blur-sm border border-neutral-200 dark:border-neutral-800")}>
                    <MarkdownContent />
                </div>
            );
    }
};
