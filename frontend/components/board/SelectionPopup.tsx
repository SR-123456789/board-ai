'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MessageCircle, Send, ExternalLink } from 'lucide-react';

interface SelectionPopupProps {
    onAsk: (text: string) => void;
    onInsert: (text: string) => void;
    onAskInNewRoom?: (text: string) => void;
}

export const SelectionPopup: React.FC<SelectionPopupProps> = ({ onAsk, onInsert, onAskInNewRoom }) => {
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
    const [selectedText, setSelectedText] = useState<string>('');
    const popupRef = useRef<HTMLDivElement>(null);

    const handleMouseUp = useCallback(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();

        if (text && text.length > 0) {
            const range = selection?.getRangeAt(0);
            const rect = range?.getBoundingClientRect();

            if (rect) {
                setSelectedText(text);
                setPosition({
                    x: rect.left + rect.width / 2,
                    y: rect.top - 10
                });
            }
        } else {
            setPosition(null);
            setSelectedText('');
        }
    }, []);

    const handleMouseDown = useCallback((e: MouseEvent) => {
        // Close popup if clicking outside
        if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
            setPosition(null);
            setSelectedText('');
        }
    }, []);

    useEffect(() => {
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('mousedown', handleMouseDown);

        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('mousedown', handleMouseDown);
        };
    }, [handleMouseUp, handleMouseDown]);

    const handleAsk = () => {
        if (selectedText) {
            onAsk(selectedText);
            setPosition(null);
            setSelectedText('');
            window.getSelection()?.removeAllRanges();
        }
    };

    const handleInsert = () => {
        if (selectedText) {
            onInsert(selectedText);
            setPosition(null);
            setSelectedText('');
            window.getSelection()?.removeAllRanges();
        }
    };

    const handleAskInNewRoom = () => {
        if (selectedText && onAskInNewRoom) {
            onAskInNewRoom(selectedText);
            setPosition(null);
            setSelectedText('');
            window.getSelection()?.removeAllRanges();
        }
    };

    if (!position || !selectedText) return null;

    return (
        <div
            ref={popupRef}
            className="fixed z-50 animate-in fade-in zoom-in-95 duration-150"
            style={{
                left: position.x,
                top: position.y,
                transform: 'translate(-50%, -100%)'
            }}
        >
            <div className="flex gap-1 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 p-1">
                <button
                    onClick={handleAsk}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                    <Send className="w-3.5 h-3.5" />
                    について聞く
                </button>
                <button
                    onClick={handleInsert}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md transition-colors"
                >
                    <MessageCircle className="w-3.5 h-3.5" />
                    chat欄へ
                </button>
                {onAskInNewRoom && (
                    <button
                        onClick={handleAskInNewRoom}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-md transition-colors"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        別ルームで質問
                    </button>
                )}
            </div>
            {/* Arrow pointing down */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full">
                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-white dark:border-t-neutral-800" />
            </div>
        </div>
    );
};

