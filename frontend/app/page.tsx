import { BoardCanvas } from '@/components/board/BoardCanvas';
import { ChatPanel } from '@/components/chat/ChatPanel';

export default function Home() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Left: Board (takes remaining space) */}
      <div className="flex-1 relative">
        <BoardCanvas />
      </div>

      {/* Right: Chat Panel (fixed width for now, or resizable) */}
      <div className="w-[400px] h-full shrink-0 shadow-xl z-10">
        <ChatPanel />
      </div>
    </div>
  );
}
