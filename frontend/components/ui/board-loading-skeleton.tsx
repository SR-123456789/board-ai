'use client';

import { Skeleton } from './skeleton';

/**
 * ボード読み込み中のスケルトン
 * ボードエリアに表示する複数のカード型スケルトン
 */
export function BoardLoadingSkeleton() {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-neutral-950">
            {/* Desktop: Board area skeleton */}
            <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-6 p-8">
                {/* Top row of cards */}
                <div className="flex gap-4">
                    <BoardCardSkeleton size="lg" />
                    <BoardCardSkeleton size="md" delay={100} />
                </div>
                {/* Bottom row of cards */}
                <div className="flex gap-4">
                    <BoardCardSkeleton size="md" delay={200} />
                    <BoardCardSkeleton size="lg" delay={300} />
                    <BoardCardSkeleton size="sm" delay={400} />
                </div>
            </div>

            {/* Desktop: Chat panel skeleton */}
            <div className="hidden md:block w-[400px] h-full shrink-0 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center gap-3 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <Skeleton className="h-5 w-24" />
                    </div>
                    {/* Messages skeleton */}
                    <div className="flex-1 space-y-4 py-4">
                        <ChatMessageSkeleton align="left" />
                        <ChatMessageSkeleton align="right" />
                        <ChatMessageSkeleton align="left" />
                    </div>
                    {/* Input skeleton */}
                    <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
                        <Skeleton className="h-12 w-full rounded-xl" />
                    </div>
                </div>
            </div>

            {/* Mobile: Full screen board skeleton */}
            <div className="md:hidden flex flex-col w-full">
                {/* Header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-5 w-20" />
                    <div className="flex-1" />
                    <Skeleton className="w-8 h-8 rounded-full" />
                </div>
                {/* Board area */}
                <div className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
                    <BoardCardSkeleton size="md" />
                    <BoardCardSkeleton size="lg" delay={100} />
                    <BoardCardSkeleton size="sm" delay={200} />
                </div>
                {/* Bottom sheet handle */}
                <div className="h-11 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-center">
                    <Skeleton className="w-8 h-1 rounded-full" />
                </div>
            </div>
        </div>
    );
}

/**
 * ボード上のカード型スケルトン
 */
function BoardCardSkeleton({ 
    size = 'md', 
    delay = 0 
}: { 
    size?: 'sm' | 'md' | 'lg';
    delay?: number;
}) {
    const sizeClasses = {
        sm: 'w-32 h-24',
        md: 'w-48 h-32',
        lg: 'w-64 h-40',
    };

    return (
        <div 
            className={`${sizeClasses[size]} bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 flex flex-col gap-2`}
            style={{ animationDelay: `${delay}ms` }}
        >
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            {size !== 'sm' && <Skeleton className="h-4 w-1/2" />}
        </div>
    );
}

/**
 * チャットメッセージスケルトン
 */
function ChatMessageSkeleton({ align }: { align: 'left' | 'right' }) {
    return (
        <div className={`flex ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] space-y-2 ${align === 'right' ? 'items-end' : 'items-start'}`}>
                <Skeleton className={`h-4 ${align === 'right' ? 'w-32' : 'w-48'}`} />
                <Skeleton className={`h-4 ${align === 'right' ? 'w-24' : 'w-40'}`} />
                <Skeleton className={`h-4 ${align === 'right' ? 'w-16' : 'w-32'}`} />
            </div>
        </div>
    );
}
