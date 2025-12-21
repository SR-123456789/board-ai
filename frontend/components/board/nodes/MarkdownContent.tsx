import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
    content: string;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content }) => (
    <div className="prose dark:prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:my-2">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
        </ReactMarkdown>
    </div>
);
