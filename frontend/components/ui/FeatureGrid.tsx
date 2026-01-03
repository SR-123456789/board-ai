'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Brain, Layout, Zap, Share2, GitBranch, MessageSquare } from 'lucide-react';

interface BentoCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  className?: string;
  children?: ReactNode;
}

function BentoCard({ title, description, icon, className, children }: BentoCardProps) {
  return (
    <div className={cn(
      "group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/50 p-6 backdrop-blur-md transition-all hover:bg-neutral-800/50 hover:border-white/20",
      className
    )}>
      <div className="flex flex-col gap-4 relative z-10">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white shadow-sm transition-colors group-hover:bg-white/10 group-hover:text-blue-300">
          {icon}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">
            {title}
          </h3>
          <p className="text-neutral-400 text-sm leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      
      {/* Visual content area */}
      {children && (
        <div className="mt-6 flex-1 relative min-h-[120px] rounded-lg border border-white/5 bg-black/20 overflow-hidden">
          {children}
        </div>
      )}

      {/* Hover Gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}

export function FeatureGrid() {
  return (
    <section className="py-24 px-4 bg-[#0A0A0A] text-white">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-16 text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight bg-gradient-to-r from-blue-200 via-white to-purple-200 bg-clip-text text-transparent">
            その会話、<br />
            すべてAIが図解します。
          </h2>
          <p className="text-neutral-400 text-lg">
            チャットするだけで、<strong className="text-white">ホワイトボードAI</strong>が議論を構造化。<br />
            これまでにない<strong className="text-white">AI学習</strong>体験へ。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4 auto-rows-[300px]">
          {/* Card 1: Large (Span 7) */}
          <BentoCard
            className="md:col-span-7"
            title="リアルタイム AI板書"
            description="会話内容をリアルタイムで解析し、AIがホワイトボードに板書。構造化されたノートが自動で完成します。"
            icon={<Zap className="w-6 h-6" />}
          >
             <div className="absolute inset-0 flex items-center justify-center p-4">
                {/* Abstract visualization of typing -> nodes */}
                <div className="w-full h-full flex gap-4 items-center justify-center opacity-70">
                   <div className="w-1/3 space-y-2">
                      <div className="h-2 w-full bg-white/10 rounded animate-pulse" />
                      <div className="h-2 w-2/3 bg-white/10 rounded animate-pulse delay-75" />
                   </div>
                   <div className="text-white/20">→</div>
                   <div className="w-1/3 h-20 border border-blue-500/30 rounded bg-blue-500/10 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full border border-white/20" />
                   </div>
                </div>
             </div>
          </BentoCard>

          {/* Card 2: Medium (Span 5) */}
          <BentoCard
            className="md:col-span-5"
            title="思考フレームワーク"
            description="SWOT分析、ロジックツリーなど、文脈に合わせて最適なフレームワークを自動適用。"
            icon={<Brain className="w-6 h-6" />}
          >
            <div className="absolute inset-0 p-4 flex items-center justify-center">
               <div className="grid grid-cols-2 gap-2 w-3/4 opacity-60">
                  <div className="aspect-square rounded border border-white/10 bg-white/5" />
                  <div className="aspect-square rounded border border-white/10 bg-white/5" />
                  <div className="aspect-square rounded border border-white/10 bg-white/5" />
                  <div className="aspect-square rounded border border-white/10 bg-white/5" />
               </div>
            </div>
          </BentoCard>

          {/* Card 3: Medium (Span 4) */}
          <BentoCard
            className="md:col-span-4"
            title="インタラクティブ学習"
            description="ボード上の要素をクリックして深掘り。ホワイトボードAI学習なら、知識の探索に終わりはありません。"
            icon={<Layout className="w-6 h-6" />}
          />

          {/* Card 4: Medium (Span 4) */}
          <BentoCard
            className="md:col-span-4"
            title="ファイルからAI板書"
            description="資料をアップロードして解説を依頼。PDFや画像の内容も、AIがホワイトボードに分かりやすく整理します。"
            icon={<Share2 className="w-6 h-6" />}
          />

          {/* Card 5: Medium (Span 4) */}
          <BentoCard
            className="md:col-span-4"
            title="チャット連携"
            description="板書内容はチャットの文脈として保持されます。AIとの対話とビジュアル整理がシームレスに連動。"
            icon={<MessageSquare className="w-6 h-6" />}
          />
        </div>
      </div>
    </section>
  );
}
