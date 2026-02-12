import React from 'react';

interface FlowStepsProps {
  language: 'ja' | 'en';
}

const FlowSteps: React.FC<FlowStepsProps> = ({ language }) => {
  console.log('[v0] FlowSteps rendering', { language });
  const isJa = language === 'ja';
  
  const steps = [
    {
      number: '1',
      title: isJa ? 'トラックをアップロード' : 'Upload Your Track',
      desc: isJa ? 'ログイン不要で分析開始' : 'Start analysis without login',
      icon: '↑',
    },
    {
      number: '2',
      title: isJa ? '無料プレビューを試聴' : 'Preview for Free',
      desc: isJa ? 'マスタリング結果を確認' : 'Check mastering result',
      icon: '▶',
    },
    {
      number: '3',
      title: isJa ? '気に入ったら購入' : 'Purchase if You Like',
      desc: isJa ? 'ログインしてダウンロード' : 'Login & download',
      icon: '✓',
    },
  ];

  return (
    <section className="animate-fade-up">
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/15 border border-cyan-400/40">
            <span className="text-xs font-extrabold text-cyan-300 uppercase tracking-widest">
              {isJa ? 'シンプルな3ステップ' : 'Simple 3 Steps'}
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-white">
            {isJa ? '完全無料で試せます' : 'Try for Free'}
          </h2>
          <p className="text-sm text-zinc-300 max-w-2xl mx-auto">
            {isJa
              ? 'ログイン不要でプレビューまで聴けます。ダウンロードする時だけログインしてください。'
              : 'Preview without login. Only sign in when you want to download.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {steps.map((step, idx) => (
            <div key={idx} className="relative flex flex-col items-center text-center p-6 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05] hover:border-cyan-400/30 transition-all duration-300">
              <div className="absolute -top-4 w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 flex items-center justify-center text-black text-lg font-extrabold shadow-xl shadow-cyan-500/30">
                {step.number}
              </div>
              <div className="text-5xl mb-4 mt-2 opacity-20">{step.icon}</div>
              <h3 className="text-lg font-extrabold text-white mb-2">{step.title}</h3>
              <p className="text-sm text-zinc-400">{step.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center pt-4">
          <p className="text-xs text-zinc-500">
            {isJa
              ? '↑ ページ上部のドロップエリアにトラックを投入するだけで、すぐに無料プレビューを聴けます。'
              : '↑ Drop a track in the area above to instantly preview for free.'}
          </p>
        </div>
      </div>
    </section>
  );
};

export default FlowSteps;
