'use client';

import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Button } from "@/components/ui/button";
import { Plus, LayoutTemplate } from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();

  const handleCreateRoom = () => {
    const roomId = uuidv4();
    router.push(`/room/${roomId}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">

        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-black dark:bg-white text-white dark:text-black mb-4">
            <LayoutTemplate className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Board AI
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Your AI-powered vertical notebook for learning and explaining.
          </p>
        </div>

        {/* Actions */}
        <div className="bg-white dark:bg-neutral-900 p-8 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-800 space-y-4">
          <Button
            onClick={handleCreateRoom}
            className="w-full h-12 text-lg gap-2"
            size="lg"
          >
            <Plus className="w-5 h-5" />
            Create New Room
          </Button>

          <p className="text-xs text-neutral-400">
            Rooms are temporary and exist only in your current session.
          </p>
        </div>

      </div>
    </div>
  );
}
