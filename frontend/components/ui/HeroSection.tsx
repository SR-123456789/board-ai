'use client';

import { ArrowRight, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface HeroSectionProps {
  onStart: () => void;
  user: any;
}

export function HeroSection({ onStart, user }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#0A0A0A] text-white pt-20">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 opacity-40">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <div 
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#3b82f6_0%,transparent_50%),radial-gradient(circle_at_100%_0%,#a855f7_0%,transparent_50%)] animate-aurora" 
          style={{ backgroundSize: '100% 100%' }} // Adjust based on animation needs
        />
      </div>

      <div className="container relative z-10 px-4 md:px-6 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-sm font-medium text-white/80 mb-8 animate-float">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span className="bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
            AIとの会話を、自動でホワイトボードに整理
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-[1.1] mb-8 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent drop-shadow-sm">
          Think Visually.
          <br />
          <span className="text-4xl md:text-6xl lg:text-7xl text-white/40 font-medium tracking-tight">
            with Board AI
          </span>
        </h1>

        {/* Description */}
        <p className="max-w-[640px] text-lg md:text-xl text-neutral-400 mb-12 leading-relaxed">
         <strong className="text-white">板書AI</strong>は、あなたの思考をリアルタイムで可視化する<strong className="text-white">ビジュアル学習AI</strong>。<br className="hidden md:block" />
         議論や学習の内容を<strong className="text-white">AI板書</strong>で構造化。もう、メモを取る必要はありません。
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <button
            onClick={() => onStart()} 
            className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-black bg-white rounded-full hover:bg-neutral-200 transition-all duration-300 hover:scale-105"
          >
            {user ? 'ボードを開く' : '無料で登録して始める'}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            <div className="absolute inset-0 rounded-full ring-2 ring-white/20 group-hover:ring-white/40 transition-all" />
          </button>
          
          <button 
            className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-medium text-white bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all duration-300 backdrop-blur-sm"
          >
           デモを見る
          </button>
        </div>

        {/* Mock UI / Visual Elements - "Floating Cards" */}
        <div className="mt-24 w-full max-w-5xl relative perspective-[1000px]">
          <div className="relative rounded-xl border border-white/10 bg-neutral-900/50 backdrop-blur-md shadow-2xl overflow-hidden aspect-[16/9] rotate-x-12 transform-gpu transition-transform hover:rotate-x-0 duration-700">
             {/* Mock Header */}
             <div className="h-12 border-b border-white/10 flex items-center px-4 gap-2 bg-neutral-900/80">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
             </div>
             {/* Mock Content */}
             <div className="p-8 grid grid-cols-12 gap-6 h-full text-left">
                <div className="col-span-4 space-y-4">
                   <div className="h-20 rounded-lg bg-white/5 animate-pulse" />
                   <div className="h-32 rounded-lg bg-white/5 animate-pulse delay-75" />
                   <div className="h-16 rounded-lg bg-white/5 animate-pulse delay-150" />
                </div>
                <div className="col-span-8 relative">
                   {/* Connection Lines */}
                   <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                      <path d="M100,50 C200,50 200,150 300,150" fill="none" stroke="white" strokeWidth="2" />
                      <path d="M100,200 C200,200 200,150 300,150" fill="none" stroke="white" strokeWidth="2" />
                   </svg>
                   <div className="absolute top-10 left-10 w-40 h-24 rounded-xl border border-blue-500/30 bg-blue-500/10 backdrop-blur flex items-center justify-center">
                      <span className="text-blue-200 text-sm font-mono">Central Idea</span>
                   </div>
                   <div className="absolute top-40 left-60 w-40 h-24 rounded-xl border border-purple-500/30 bg-purple-500/10 backdrop-blur flex items-center justify-center">
                      <span className="text-purple-200 text-sm font-mono">Related Concept</span>
                   </div>
                </div>
             </div>
          </div>
          
          {/* Ambient Glow behind the mock */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-500/10 blur-[100px] -z-10 rounded-full" />
        </div>
      </div>
    </section>
  );
}
