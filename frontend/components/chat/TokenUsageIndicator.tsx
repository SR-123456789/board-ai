'use client';

import { useState, useRef, useEffect } from 'react';
import { User, LogOut, Zap } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface UsageStats {
    plan: string;
    tokenUsage: number;
    maxTokens: number;
}

export function TokenUsageIndicator({ usage }: { usage: UsageStats | null }) {
    const [isOpen, setIsOpen] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUserEmail(user?.email ?? null);
        };
        getUser();
    }, [supabase]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.refresh();
        router.push('/login');
    };

    if (!usage && !userEmail) return null;

    const percentage = usage && usage.maxTokens > 0
        ? Math.min(100, (usage.tokenUsage / usage.maxTokens) * 100)
        : 0;

    const isUnlimited = usage?.maxTokens === -1;

    return (
        <div className="relative" ref={popoverRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${isOpen
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                    }`}
                title="アカウント"
            >
                <User className="w-4 h-4" />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* User Info Header */}
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-neutral-100 dark:border-neutral-800">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                                {userEmail ? userEmail[0].toUpperCase() : '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                                    {userEmail || 'ゲスト'}
                                </p>
                                <p className="text-xs text-neutral-500 flex items-center gap-1">
                                    <span className="px-1.5 py-0.5 bg-white/50 dark:bg-neutral-800 rounded uppercase font-medium">
                                        {usage?.plan || 'free'}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Usage Stats */}
                    {usage && (
                        <div className="p-4 space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                トークン使用量
                            </div>

                            {!isUnlimited ? (
                                <div className="space-y-2">
                                    <div className="h-2.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ease-out ${percentage > 90 ? 'bg-red-500' :
                                                    percentage > 70 ? 'bg-orange-500' : 'bg-blue-500'
                                                }`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-neutral-500">
                                        <span>{usage.tokenUsage.toLocaleString()} 使用中</span>
                                        <span>残り {(usage.maxTokens - usage.tokenUsage).toLocaleString()}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-xs text-center">
                                    ✨ 無制限プラン
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="border-t border-neutral-100 dark:border-neutral-800 p-2">
                        <button
                            onClick={handleSignOut}
                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            ログアウト
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
