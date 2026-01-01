'use client';

import { Skeleton } from './skeleton';

/**
 * Room一覧カードのスケルトン
 * 実際のRoomカードと同じレイアウトを模倣
 */
export function RoomCardSkeleton() {
    return (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    {/* Mode badge + message count */}
                    <div className="flex items-center gap-2 mb-2">
                        <Skeleton className="h-5 w-16 rounded" />
                        <Skeleton className="h-4 w-12" />
                    </div>
                    {/* Message preview */}
                    <Skeleton className="h-5 w-full mb-2" />
                    <Skeleton className="h-5 w-2/3" />
                    {/* Timestamp */}
                    <div className="flex items-center gap-1 mt-3">
                        <Skeleton className="h-3 w-3 rounded-full" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </div>
                {/* Delete button placeholder */}
                <div className="w-8 h-8" />
            </div>
        </div>
    );
}

/**
 * Room一覧のスケルトン群
 * 複数のカードスケルトンを表示
 */
export function RoomListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <RoomCardSkeleton key={i} />
            ))}
        </div>
    );
}
