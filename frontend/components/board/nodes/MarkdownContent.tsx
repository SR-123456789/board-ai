'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MermaidDiagram } from './MermaidDiagram';
import { D2Diagram } from './D2Diagram';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownContentProps {
    content: string;
    onUpdate?: (newContent: string) => void;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, onUpdate }) => (
    <div className="prose dark:prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-pre:bg-[#1e1e1e] prose-pre:p-0 prose-pre:rounded-lg">
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1] : '';
                    const codeString = String(children).replace(/\n$/, '');
                    
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { ref, ...rest } = props as any;

                    if (language === 'mermaid') {
                        return <MermaidDiagram chart={codeString} />;
                    }

                    if (language === 'd2') {
                        return (
                            <D2Diagram 
                                code={codeString} 
                                onFix={(fixed) => {
                                    if (onUpdate) {
                                        // Replace the specific D2 block in the full content
                                        const newContent = content.replace(codeString, fixed);
                                        onUpdate(newContent);
                                    }
                                }}
                            />
                        );
                    }

                    if (match) {
                        return (
                            <div className="relative rounded-lg overflow-hidden my-4 border border-[#333]">
                                <div className="flex items-center justify-between px-3 py-1 bg-[#252526] border-b border-[#333]">
                                    <span className="text-xs text-[#ccc] font-mono">{language}</span>
                                </div>
                                <SyntaxHighlighter
                                    {...rest}
                                    style={vscDarkPlus}
                                    language={language}
                                    PreTag="div"
                                    customStyle={{ margin: 0, padding: '1rem', background: '#1e1e1e', fontSize: '0.9em' }}
                                >
                                    {codeString}
                                </SyntaxHighlighter>
                            </div>
                        );
                    }

                    // Inline code
                    return (
                        <code className={`${className} bg-neutral-200 dark:bg-neutral-800 px-1 py-0.5 rounded text-sm`} {...props}>
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
