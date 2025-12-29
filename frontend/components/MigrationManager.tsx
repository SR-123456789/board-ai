'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export function MigrationManager() {
    const [isMigrating, setIsMigrating] = useState(false);
    const [status, setStatus] = useState('');
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const checkMigration = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Check if we have local data to migrate
            const boardStorage = localStorage.getItem('board-storage');
            const chatStorage = localStorage.getItem('chat-storage');
            const managedStorage = localStorage.getItem('managed-storage');

            // Check if already migrated
            const isMigrated = localStorage.getItem('supabase_migrated');
            if (isMigrated) return;

            const hasData = boardStorage || chatStorage || managedStorage;

            if (hasData) {
                setIsMigrating(true);
                setStatus('以前のデータを同期中...');

                try {
                    const payload = {
                        boards: boardStorage ? JSON.parse(boardStorage) : null,
                        chats: chatStorage ? JSON.parse(chatStorage) : null,
                        managed: managedStorage ? JSON.parse(managedStorage) : null
                    };

                    const res = await fetch('/api/migrate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    if (!res.ok) throw new Error('Migration failed');

                    localStorage.setItem('supabase_migrated', 'true');
                    setStatus('完了しました');
                    setTimeout(() => {
                        setIsMigrating(false);
                        router.refresh();
                    }, 1000);
                } catch (e) {
                    console.error('Migration error:', e);
                    setStatus('同期に失敗しました');
                    setTimeout(() => setIsMigrating(false), 2000);
                }
            }
        };

        checkMigration();
    }, [supabase, router]);

    if (!isMigrating) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-xl text-center max-w-sm w-full mx-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold mb-2">データ同期中</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{status}</p>
            </div>
        </div>
    );
}
