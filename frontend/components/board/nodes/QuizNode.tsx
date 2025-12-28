'use client';

import React, { useState } from 'react';
import { Check, X, ChevronDown, ChevronUp, HelpCircle, Send, ArrowRight, Loader2 } from 'lucide-react';

interface PracticeQuestion {
    question: string;
    type: 'choice' | 'freeform';
    options?: string[];
    correctAnswer?: number;
    keywords?: string[];
    explanation?: string;
}

interface QuizNodeProps {
    question: PracticeQuestion;
    onAnswer?: (answer: string, isCorrect: boolean) => void;
    onNext?: (isCorrect: boolean) => void;
}

export const QuizNode: React.FC<QuizNodeProps> = ({ question, onAnswer, onNext }) => {
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [freeformAnswer, setFreeformAnswer] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [evaluationResult, setEvaluationResult] = useState<{
        isCorrect: boolean;
        feedback: string;
        improvement?: string;
    } | null>(null);

    const isCorrect = () => {
        if (question.type === 'choice') {
            return selectedAnswer === question.correctAnswer;
        } else if (question.type === 'freeform') {
            return evaluationResult?.isCorrect ?? false;
        }
        return false;
    };

    const handleSubmit = async () => {
        if (question.type === 'choice' && selectedAnswer === null) return;
        if (question.type === 'freeform' && !freeformAnswer.trim()) return;

        if (question.type === 'freeform') {
            // Call API for freeform evaluation
            setIsEvaluating(true);
            try {
                const response = await fetch('/api/managed/evaluate-freeform', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        question: question.question,
                        userAnswer: freeformAnswer,
                    }),
                });
                const result = await response.json();
                setEvaluationResult(result);
                setIsSubmitted(true);
                setShowExplanation(true);
                onAnswer?.(freeformAnswer, result.isCorrect);
            } catch (error) {
                console.error('Evaluation error:', error);
                // Fallback: assume correct
                setEvaluationResult({ isCorrect: true, feedback: '回答を確認しました！' });
                setIsSubmitted(true);
                setShowExplanation(true);
                onAnswer?.(freeformAnswer, true);
            } finally {
                setIsEvaluating(false);
            }
        } else {
            // Choice type - evaluate locally
            setIsSubmitted(true);
            setShowExplanation(true);
            const answer = question.options?.[selectedAnswer!] || '';
            onAnswer?.(answer, isCorrect());
        }
    };

    const handleReset = () => {
        setSelectedAnswer(null);
        setFreeformAnswer('');
        setIsSubmitted(false);
        setShowExplanation(false);
        setEvaluationResult(null);
    };

    const handleNext = () => {
        onNext?.(isCorrect());
    };

    return (
        <div className="rounded-xl border-2 border-purple-300 dark:border-purple-700 bg-purple-50/80 dark:bg-purple-900/20 overflow-hidden backdrop-blur-sm">
            {/* Header */}
            <div className="px-4 py-3 bg-purple-100 dark:bg-purple-900/40 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span className="font-bold text-purple-800 dark:text-purple-300 text-sm">確認問題</span>
                {isSubmitted && (
                    <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${isCorrect()
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                        }`}>
                        {isCorrect() ? '✓ 正解！' : '✗ 不正解'}
                    </span>
                )}
            </div>

            {/* Question */}
            <div className="p-5">
                <p className="font-semibold text-neutral-800 dark:text-neutral-200 mb-5 text-base leading-relaxed">
                    {question.question}
                </p>

                {/* Choice Options */}
                {question.type === 'choice' && question.options && (
                    <div className="space-y-3 mb-5">
                        {question.options.map((option, index) => {
                            const isSelected = selectedAnswer === index;
                            const isAnswer = question.correctAnswer === index;

                            let optionClass = 'border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800';
                            if (isSubmitted) {
                                if (isAnswer) {
                                    optionClass = 'border-green-500 bg-green-50 dark:bg-green-900/40';
                                } else if (isSelected && !isAnswer) {
                                    optionClass = 'border-red-500 bg-red-50 dark:bg-red-900/40';
                                }
                            } else if (isSelected) {
                                optionClass = 'border-purple-500 bg-purple-50 dark:bg-purple-900/30';
                            }

                            return (
                                <button
                                    key={index}
                                    onClick={() => !isSubmitted && setSelectedAnswer(index)}
                                    disabled={isSubmitted}
                                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center gap-3 ${optionClass} ${!isSubmitted ? 'hover:border-purple-400 hover:shadow-md cursor-pointer' : 'cursor-default'
                                        }`}
                                >
                                    <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0 ${isSubmitted && isAnswer ? 'bg-green-500 border-green-500 text-white' :
                                        isSubmitted && isSelected && !isAnswer ? 'bg-red-500 border-red-500 text-white' :
                                            isSelected ? 'bg-purple-500 border-purple-500 text-white' :
                                                'border-neutral-300 dark:border-neutral-600'
                                        }`}>
                                        {isSubmitted && isAnswer ? (
                                            <Check className="w-4 h-4" />
                                        ) : isSubmitted && isSelected && !isAnswer ? (
                                            <X className="w-4 h-4" />
                                        ) : (
                                            String.fromCharCode(65 + index)
                                        )}
                                    </span>
                                    <span className="text-sm">{option}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Freeform Input */}
                {question.type === 'freeform' && (
                    <div className="mb-5">
                        <textarea
                            value={freeformAnswer}
                            onChange={(e) => setFreeformAnswer(e.target.value)}
                            disabled={isSubmitted || isEvaluating}
                            placeholder="回答を入力してください..."
                            className="w-full px-4 py-3 rounded-xl border-2 border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 disabled:opacity-60"
                            rows={3}
                        />
                        {/* AI Feedback for freeform */}
                        {isSubmitted && evaluationResult && (
                            <div className={`mt-3 p-3 rounded-lg text-sm ${evaluationResult.isCorrect
                                ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                                : 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800'
                                }`}>
                                <p className="font-medium">{evaluationResult.feedback}</p>
                                {evaluationResult.improvement && (
                                    <p className="mt-1 text-xs opacity-80">💡 {evaluationResult.improvement}</p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Buttons */}
                <div className="flex items-center gap-3">
                    {!isSubmitted ? (
                        <button
                            onClick={handleSubmit}
                            disabled={
                                isEvaluating ||
                                (question.type === 'choice' && selectedAnswer === null) ||
                                (question.type === 'freeform' && !freeformAnswer.trim())
                            }
                            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 text-white rounded-xl text-sm font-bold transition-colors disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                        >
                            {isEvaluating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    採点中...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    回答する
                                </>
                            )}
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={handleReset}
                                className="px-5 py-2.5 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-xl text-sm font-bold transition-colors"
                            >
                                もう一度
                            </button>
                            {onNext && (
                                <button
                                    onClick={handleNext}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg hover:shadow-xl"
                                >
                                    次へ
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            )}
                        </>
                    )}
                </div>

                {/* Explanation */}
                {isSubmitted && question.explanation && (
                    <div className="mt-5 pt-5 border-t border-purple-200 dark:border-purple-800">
                        <button
                            onClick={() => setShowExplanation(!showExplanation)}
                            className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium transition-colors"
                        >
                            {showExplanation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            解説を{showExplanation ? '閉じる' : '見る'}
                        </button>
                        {showExplanation && (
                            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed bg-white/50 dark:bg-black/20 p-4 rounded-lg">
                                {question.explanation}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

