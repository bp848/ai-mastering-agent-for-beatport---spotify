import React, { useState, useEffect } from 'react';

type LoaderMode = 'analysis' | 'mastering';

interface Props {
  mode: LoaderMode;
}

/* 1回目：分析フェーズ (Diagnosis) — テーマ「精密検査」 */
const ANALYSIS_TEXTS = [
  '[INIT] オーディオデータをデコード中... (24bit Float)',
  '[FFT] 周波数スペクトルと位相干渉をスキャン中...',
  '[DETECT] 低域のステレオ成分と「濁り」を検知...',
  '[CALC] Beatport Top 100 基準とのLUFS乖離を計算中...',
  '[DONE] 診断レポートを作成しました。',
];

/* 2回目：マスタリング実行フェーズ (Processing) — テーマ「構築・注入」 */
const MASTERING_TEXTS = [
  '[BOOT] Hybrid-Analog Engine を初期化中...',
  '[APPLY] 真空管サチュレーションとPultec EQを適用...',
  '[SPACE] M/S処理でステレオ空間を拡張中...',
  '[INJECT] Neuro-Driveモジュール: エネルギー密度を注入...',
  '[LIMIT] ソフトクリッパーでトランジェントを保護しながら最大化...',
  '[EXPORT] 16bit / 44.1kHz WAVのマスタリング完了。',
];

const TEXTS: Record<LoaderMode, string[]> = {
  analysis: ANALYSIS_TEXTS,
  mastering: MASTERING_TEXTS,
};

const CAPTIONS: Record<LoaderMode, string> = {
  analysis: 'SCANNING AUDIO DATA...',
  mastering: 'PROCESSING AUDIO CHAIN...',
};

export const StatusLoader: React.FC<Props> = ({ mode }) => {
  const [currentLine, setCurrentLine] = useState(0);
  const messages = TEXTS[mode];

  useEffect(() => {
    setCurrentLine(0);
  }, [mode]);

  useEffect(() => {
    if (currentLine >= messages.length - 1) return;

    const delay = mode === 'analysis' ? 1200 : 1500;

    const timer = setTimeout(() => {
      setCurrentLine((prev) => prev + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [currentLine, mode, messages.length]);

  return (
    <div className="flex flex-col items-center justify-center space-y-6 w-full max-w-lg mx-auto p-8">
      {/* Loading Spinner */}
      <div className="relative w-16 h-16">
        <div
          className={`absolute inset-0 border-4 border-t-transparent rounded-full animate-spin ${
            mode === 'analysis' ? 'border-green-500' : 'border-cyan-500'
          }`}
        />
        <div
          className={`absolute inset-2 border-4 border-b-transparent rounded-full animate-spin opacity-50 ${
            mode === 'analysis' ? 'border-green-900' : 'border-cyan-900'
          }`}
          style={{ animationDuration: '2s' }}
        />
      </div>

      {/* Terminal Text Area */}
      <div className="w-full bg-black/50 backdrop-blur-md border border-white/10 rounded-lg p-4 font-mono text-xs sm:text-sm min-h-[8rem] overflow-hidden flex flex-col-reverse shadow-inner">
        {messages
          .slice(0, currentLine + 1)
          .reverse()
          .map((msg, i) => (
            <div
              key={i}
              className={`mb-1 ${
                i === 0
                  ? mode === 'analysis'
                    ? 'text-green-400 animate-pulse'
                    : 'text-cyan-400 animate-pulse'
                  : 'text-zinc-500'
              }`}
            >
              <span className="opacity-50 mr-2">{i === 0 ? '>' : '$'}</span>
              {msg}
            </div>
          ))}
      </div>

      {/* Sub Caption */}
      <p className="text-zinc-500 text-xs uppercase tracking-widest animate-pulse">
        {CAPTIONS[mode]}
      </p>
    </div>
  );
};

export default StatusLoader;
