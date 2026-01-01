'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
    className?: string;
}

/**
 * 基本のスケルトンコンポーネント
 * パルスアニメーション付きのプレースホルダー
 */
export function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={cn(
                'animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800',
                className
            )}
        />
    );
}

/**
 * テキスト用スケルトン
 * 複数行のテキストをシミュレート
 */
export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
    return (
        <div className={cn('space-y-2', className)}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={cn(
                        'h-4',
                        i === lines - 1 ? 'w-3/4' : 'w-full'
                    )}
                />
            ))}
        </div>
    );
}

/**
 * アバター用円形スケルトン
 */
export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-12 h-12',
    };

    return (
        <Skeleton className={cn('rounded-full', sizeClasses[size])} />
    );
}
