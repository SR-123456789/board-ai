'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

interface SuggestedQuestionsProps {
    questions: string[];
    onQuestionClick: (question: string) => void;
    isLoading?: boolean;
}

export const SuggestedQuestions: React.FC<SuggestedQuestionsProps> = ({
    questions,
    onQuestionClick,
    isLoading = false
}) => {
    if (questions.length === 0 || isLoading) return null;

    return (
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-4 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-2 mb-3 text-neutral-600 dark:text-neutral-400">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-medium">次に気になるかも？</span>
                </div>
                <div className="flex flex-col gap-2">
                    {questions.map((question, index) => (
                        <button
                            key={index}
                            onClick={() => onQuestionClick(question)}
                            className="w-full text-left px-4 py-3 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 transition-all duration-200 text-sm leading-relaxed"
                        >
                            {question}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
