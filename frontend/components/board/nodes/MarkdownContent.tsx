'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MermaidDiagram } from './MermaidDiagram';

interface MarkdownContentProps {
    content: string;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content }) => (
    <div className="prose dark:prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:my-2">
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1] : '';
                    const codeString = String(children).replace(/\n$/, '');

                    if (language === 'mermaid') {
                        return <MermaidDiagram chart={codeString} />;
                    }

                    // Default code rendering
                    return (
                        <code className={className} {...props}>
                            {children}
                        </code>
                    );
                },
            }}
        >
            {content}
        </ReactMarkdown>
    </div>
);
