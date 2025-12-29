'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import { UserMenu } from '@/components/UserMenu';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import {
  Sparkles,
  PenTool,
  Brain,
  MousePointerClick,
  ArrowRight,
  MessageSquareText,
  LayoutGrid,
  GitBranch,
  FolderOpen
} from 'lucide-react';

const features = [
  {
    icon: PenTool,
    title: 'ホワイトボード形式',
    description: 'AIがリアルタイムでノートを作成。チャットは一言、情報はボードに集約。',
    color: 'blue'
  },
  {
    icon: Brain,
    title: 'フレームワーク思考',
    description: '理論・比較・手順など、テーマに最適な思考フレームワークを自動選択。',
    color: 'purple'
  },
  {
    icon: GitBranch,
    title: 'ビジュアル表現',
    description: 'フローチャート、マインドマップ、表を自動生成。一目で理解。',
    color: 'green'
  },
  {
    icon: MousePointerClick,
    title: 'インタラクティブ',
    description: 'ボード上のテキストを選択して深掘り。次の質問もAIが提案。',
    color: 'orange'
  }
];

const colorClasses: { [key: string]: { bg: string; text: string; border: string } } = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  green: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' }
};

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
    // Guest mode: Create a random room ID and go there immediately.
    // Login will be required when they try to "Save" or "Send Message".
    const newRoomId = uuidv4().substring(0, 8);
    router.push(`/room/${newRoomId}`);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white">
      {/* Header/Nav */}
      <nav className="fixed top-0 left-0 right-0 p-4 flex justify-between items-center z-50 pointer-events-none">
        <div className="pointer-events-auto">
          {/* Logo placeholder */}
        </div>
        <div className="pointer-events-auto">
          {user ? (
            <UserMenu />
          ) : (
            <Link href="/login" className="px-4 py-2 bg-white dark:bg-neutral-800 rounded-full shadow-sm text-sm font-medium hover:bg-neutral-50 transition-colors">
              ログイン
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-6 py-20 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.08),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.08),transparent_50%)]" />
        </div>

        <div className="max-w-4xl w-full text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-sm font-medium shadow-sm">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span className="text-neutral-600 dark:text-neutral-300">AIが板書する新しい学習体験</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-tight">
            <span className="block">チャットだけじゃない。</span>
            <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              AIが書く。あなたが学ぶ。
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Board AIは、AIがホワイトボードにノートを書きながら教える、<br className="hidden sm:block" />
            <strong className="text-neutral-900 dark:text-white">ビジュアル学習</strong>プラットフォームです。
          </p>

          {/* CTA */}
          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleStart}
              className="group inline-flex items-center gap-3 px-8 py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-lg font-bold rounded-full hover:scale-105 active:scale-100 transition-transform shadow-xl shadow-neutral-900/20"
            >
              {user ? 'ルーム一覧へ' : '無料で始める'}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            {user && (
              <Link
                href="/room"
                className="inline-flex items-center gap-2 px-6 py-3 text-neutral-600 dark:text-neutral-400 text-sm font-medium hover:text-neutral-900 dark:hover:text-white transition-colors"
              >
                <FolderOpen className="w-4 h-4" />
                ルーム一覧を見る
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 bg-white dark:bg-neutral-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">なぜBoard AIなのか</h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">従来のAIチャットとは違う、4つの特徴</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              const colors = colorClasses[feature.color];
              return (
                <div
                  key={i}
                  className={`p-8 rounded-3xl border ${colors.border} ${colors.bg} transition-all hover:scale-[1.02]`}
                >
                  <div className={`w-14 h-14 rounded-2xl ${colors.bg} ${colors.text} flex items-center justify-center mb-6 border ${colors.border}`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-16">使い方はシンプル</h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: '質問する', desc: '学びたいことを入力' },
              { step: '2', title: 'AIが板書', desc: 'ホワイトボードに整理' },
              { step: '3', title: '深掘りする', desc: '気になる箇所をクリック' }
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center text-2xl font-black">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-neutral-600 dark:text-neutral-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-gradient-to-br from-neutral-900 to-neutral-800 dark:from-neutral-800 dark:to-neutral-900">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            今すぐ、新しい学びを始めよう
          </h2>
          <p className="text-lg text-neutral-300 mb-10">
            アカウント登録不要。ブラウザだけで、すぐに使えます。
          </p>
          <button
            onClick={handleStart}
            className="group inline-flex items-center gap-3 px-10 py-5 bg-white text-neutral-900 text-xl font-bold rounded-full hover:scale-105 active:scale-100 transition-transform shadow-2xl"
          >
            Board AIを試す
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 text-center text-sm text-neutral-500 dark:text-neutral-600">
        <p>© 2024 Board AI</p>
      </footer>
    </div>
  );
}
