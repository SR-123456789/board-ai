'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import { UserMenu } from '@/components/UserMenu';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { HeroSection } from '@/components/ui/HeroSection';
import { FeatureGrid } from '@/components/ui/FeatureGrid';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();
  }, [supabase]);

  const handleStart = () => {
    if (user) {
        // Logged in: go to rooms
        router.push('/room');
    } else {
        // Not logged in: go to login (signup is handled there or via a toggle)
        // User explicitly requested "Account creation is mandatory"
        router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-blue-500/30 selection:text-blue-200">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
            {/* Logo Area */}
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl tracking-tight text-white hidden sm:block">
                    板書AI
                </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
                {user ? (
                    <div className="flex items-center gap-4">
                        <Link 
                            href="/room" 
                            className="hidden sm:inline-flex text-sm font-medium text-neutral-300 hover:text-white transition-colors"
                        >
                            ダッシュボード
                        </Link>
                        <UserMenu />
                    </div>
                ) : (
                    <>
                        <Link 
                            href="/login" 
                            className="text-sm font-medium text-neutral-300 hover:text-white transition-colors px-4 py-2"
                        >
                            ログイン
                        </Link>
                        <button 
                            onClick={handleStart}
                            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-black bg-white rounded-full hover:bg-neutral-200 transition-colors"
                        >
                            新規登録
                        </button>
                    </>
                )}
            </div>
        </div>
      </nav>

      {/* Hero Section */}
      <HeroSection onStart={handleStart} user={user} />

      {/* Feature Grid (Bento) */}
      <FeatureGrid />

      {/* How it works Section - Simplified & Modernized */}
      <section className="py-32 px-4 bg-[#0A0A0A]">
          <div className="container mx-auto max-w-5xl">
              <div className="grid md:grid-cols-2 gap-16 items-center">
                  <div>
                      <h2 className="text-3xl md:text-5xl font-bold mb-8 leading-tight">
                          直感的な操作で、<br />
                          <span className="text-neutral-500">学びを加速する。</span>
                      </h2>
                      <div className="space-y-12">
                          {[
                              { step: "01", title: "チャットで話しかける", desc: "AIがあなたの意図を理解し、レスポンスを返します。" },
                              { step: "02", title: "自動で板書される", desc: "リアルタイムでホワイトボードに要点が整理され、関係性が可視化されます。" },
                              { step: "03", title: "クリックして深掘り", desc: "気になった部分をクリックするだけで、AIがさらに詳細な解説を行います。" }
                          ].map((item, i) => (
                              <div key={i} className="group flex gap-6">
                                  <div className="text-2xl font-mono text-neutral-700 group-hover:text-blue-500 transition-colors duration-300">
                                      {item.step}
                                  </div>
                                  <div>
                                      <h3 className="text-xl font-bold mb-2 group-hover:text-white transition-colors">{item.title}</h3>
                                      <p className="text-neutral-400 leading-relaxed max-w-sm">
                                          {item.desc}
                                      </p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
                  {/* Visual Decoration */}
                  <div className="relative aspect-square">
                      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-purple-500/10 rounded-full blur-3xl" />
                      <div className="relative h-full w-full rounded-2xl border border-white/10 bg-neutral-900/50 backdrop-blur-sm p-8 flex items-center justify-center">
                          <div className="text-center space-y-4">
                              <div className="text-6xl animate-bounce">👆</div>
                              <p className="text-neutral-400">Try it yourself</p>
                              <button 
                                onClick={handleStart}
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-medium transition-colors shadow-lg shadow-blue-600/20"
                              >
                                  デモを試す（登録して開始）
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* Large CTA Section */}
      <section className="py-40 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] to-[#111]" />
        
        {/* Abstract Background Element */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="container relative z-10 mx-auto max-w-4xl text-center">
           <h2 className="text-4xl md:text-7xl font-bold mb-8 tracking-tighter">
              Start your visual learning journey.
           </h2>
           <p className="text-xl text-neutral-400 mb-12 max-w-2xl mx-auto">
              アカウント作成は無料。今すぐホワイトボードAIのパワーを体験できます。
           </p>
           
           <button
            onClick={handleStart}
            className="group inline-flex items-center gap-3 px-10 py-5 bg-white text-black text-xl font-bold rounded-full hover:scale-105 transition-transform duration-300 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
           >
            無料で登録して始める
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
           </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 bg-[#050505]">
         <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
             <div className="flex items-center gap-2">
                 <Sparkles className="w-5 h-5 text-neutral-500" />
                 <span className="font-bold text-neutral-400">板書AI</span>
             </div>
             <p className="text-sm text-neutral-600">
                 © 2024 Board AI. All rights reserved.
             </p>
             <div className="flex gap-6 text-sm text-neutral-500">
                 <Link href="#" className="hover:text-neutral-300 transition-colors">利用規約</Link>
                 <Link href="#" className="hover:text-neutral-300 transition-colors">プライバシーポリシー</Link>
                 <Link href="#" className="hover:text-neutral-300 transition-colors">お問い合わせ</Link>
             </div>
         </div>
      </footer>
    </div>
  );
}
