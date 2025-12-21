import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Send, Paperclip, X, FileText, Presentation } from 'lucide-react';
import { cn } from '@/lib/utils';
import TextareaAutosize from 'react-textarea-autosize';

interface ChatInputProps {
    onSend: (message: string, files: File[]) => void;
    isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading }) => {
    const [input, setInput] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if ((input.trim() || files.length > 0) && !isLoading) {
            onSend(input.trim(), files);
            setInput('');
            setFiles([]);
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Clear the file input
            }
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setFiles(prevFiles => [...prevFiles, ...newFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white/50 backdrop-blur-sm space-y-3">
            {/* File Previews */}
            {files.length > 0 && (
                <div className="flex gap-2 overflow-x-auto py-2">
                    {files.map((file, i) => (
                        <div key={i} className="relative group shrink-0">
                            <div className="w-16 h-16 rounded-lg border border-neutral-200 bg-neutral-100 flex items-center justify-center overflow-hidden">
                                {file.type.startsWith('image/') ? (
                                    <img
                                        src={URL.createObjectURL(file)}
                                        alt="preview"
                                        className="w-full h-full object-cover"
                                    />
                                ) : file.type === 'application/pdf' ? (
                                    <FileText className="w-8 h-8 text-red-500" />
                                ) : (
                                    <Presentation className="w-8 h-8 text-orange-500" />
                                )}
                            </div>
                            <button
                                onClick={() => removeFile(i)}
                                className="absolute -top-1 -right-1 bg-black text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex gap-2 items-end">
                <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                />

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-neutral-500 hover:text-neutral-900"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Paperclip className="w-5 h-5" />
                </Button>

                <div className="flex-1 relative">
                    <TextareaAutosize
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask a question..."
                        minRows={1}
                        maxRows={5}
                        className={cn(
                            "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background",
                            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            "disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                        )}
                        disabled={isLoading}
                    />
                </div>

                <Button type="submit" size="icon" disabled={isLoading || (!input.trim() && files.length === 0)}>
                    <Send className="w-4 h-4" />
                </Button>
            </form>
        </div>
    );
};
