import { Cpu, GitBranch, Bot, Building2 } from 'lucide-react';
import { useTranslation } from '../../contexts/LanguageContext';

export default function AlgorithmSection() {
  const { language, t } = useTranslation();
  const ja = language === 'ja';

  return (
    <section id="algorithm" className="scroll-mt-24 border-t border-border/50 py-16 md:py-20">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-12 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary/80">Hardware Heritage</p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            The Successor to the Legend
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
            {ja
              ? 'Rolandがビートを作り、Technicsが盤を回し、Pioneerがフロアを操った。その全ての機材は日本製でした。このAIは、その「日本の音響の執念」を受け継ぐ最後の機材です。'
              : 'Roland made the beat, Technics turned the deck, and Pioneer ruled the floor. Every legendary machine was Japanese. This AI is the logical successor to that lineage of precision.'
            }
          </p>
        </div>

        <div className="space-y-8">
          {/* 仕様 */}
          <div className="hardware-panel rounded-lg border border-white/5 p-8">
            <div className="mb-6 flex items-center gap-3">
              <Cpu className="h-6 w-6 text-primary" />
              <h3 className="led-cyan text-lg font-bold tracking-widest uppercase">Hardware Specifications</h3>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <ul className="space-y-3 text-xs text-muted-foreground/80 font-mono">
                <li className="flex justify-between"><span className="text-primary/60">INPUT:</span> <span>WAV / MP3 / AIFF / FLAC</span></li>
                <li className="flex justify-between"><span className="text-primary/60">DITHER:</span> <span>POW-r / AI-Adaptive</span></li>
                <li className="flex justify-between"><span className="text-primary/60">BIT DEPTH:</span> <span>16 / 24 bit</span></li>
                <li className="flex justify-between"><span className="text-primary/60">ENGINE:</span> <span>Hybrid-Analog v2.4</span></li>
              </ul>
              <ul className="space-y-3 text-xs text-muted-foreground/80 font-mono">
                <li className="flex justify-between"><span className="text-primary/60">LUFS TARGET:</span> <span>-9 to -14 LUFS</span></li>
                <li className="flex justify-between"><span className="text-primary/60">PEAK LIMIT:</span> <span>-0.3 to -1.0 dBTP</span></li>
                <li className="flex justify-between"><span className="text-primary/60">DSP CHAIN:</span> <span>7-Module Serial</span></li>
                <li className="flex justify-between"><span className="text-primary/60">LATENCY:</span> <span>Zero-Phase</span></li>
              </ul>
            </div>
          </div>

          {/* データフロー */}
          <div className="hardware-panel rounded-lg border border-white/5 p-8">
            <div className="mb-6 flex items-center gap-3">
              <GitBranch className="h-6 w-6 text-primary" />
              <h3 className="led-cyan text-lg font-bold tracking-widest uppercase">Internal Data Flow</h3>
            </div>
            <div className="space-y-4 text-sm">
              {[
                { step: '01', title: 'DECODE', desc: ja ? 'アップロード → Web Audio API でデコード' : 'Upload → Web Audio API decoding' },
                { step: '02', title: 'SCAN', desc: ja ? '分析 → Pyodide で FFT・LUFS・低域診断を算出' : 'Analysis → Pyodide calculating FFT, LUFS, Bass' },
                { step: '03', title: 'DECISION', desc: ja ? 'AI #1（Gemini） → マスタリングの意図を導出' : 'AI #1 (Gemini) → Deriving mastering intent' },
                { step: '04', title: 'COMPUTE', desc: ja ? 'AI #2（導出ロジック） → DSPパラメータを算出' : 'AI #2 (Logic) → Calculating DSP parameters' },
                { step: '05', title: 'VALIDATE', desc: ja ? '10秒シミュレーションで目標値を検証' : '10s simulation to validate target LUFS' },
                { step: '06', title: 'RENDER', desc: ja ? 'Web Audio API で高精度レンダリング' : 'High-precision Web Audio API rendering' },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-4 border-l border-white/10 pl-4 py-1">
                  <span className="led-cyan font-mono text-xs font-bold">{item.step}</span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-primary/70 tracking-widest">{item.step}. {item.title}</span>
                    <span className="text-muted-foreground/90">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI構成 */}
          <div className="hardware-panel rounded-lg border border-white/5 p-8">
            <div className="mb-6 flex items-center gap-3">
              <Bot className="h-6 w-6 text-primary" />
              <h3 className="led-cyan text-lg font-bold tracking-widest uppercase">AI Logic Array</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded border border-primary/20 bg-background/40 p-5 shadow-inner">
                <p className="led-orange text-[10px] font-bold tracking-[0.2em] uppercase">Module 01</p>
                <p className="mt-1 text-sm font-bold text-foreground">Gemini Pro</p>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Deriving mastering intent (AIDecision) from complex acoustic metrics.</p>
              </div>
              <div className="rounded border border-primary/20 bg-background/40 p-5 shadow-inner">
                <p className="led-orange text-[10px] font-bold tracking-[0.2em] uppercase">Module 02</p>
                <p className="mt-1 text-sm font-bold text-foreground">Acoustic Logic</p>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Converting intent into precision DSP parameters with safety guards.</p>
              </div>
              <div className="rounded border border-dashed border-white/10 bg-white/5 p-5 opacity-60">
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">Module 03</p>
                <p className="mt-1 text-sm font-bold text-muted-foreground">Style Adapters</p>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Upcoming genre-specific micro-tuning and stem-style processing.</p>
              </div>
            </div>
          </div>

          {/* 業務用適性 */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">業務用適性</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>・<strong>再現性</strong>: 同じ入力 → 同じ分析 → 同じパラメータ導出。バッチ処理・自動化に適する</li>
              <li>・<strong>トレーサビリティ</strong>: 分析値・AIDecision・DSPパラメータをログ出力可能。品質管理に活用</li>
              <li>・<strong>安全制御</strong>: キック・ベース歪みリスク、過大ゲイン、プラットフォーム天井を自動抑制</li>
              <li>・<strong>スケーラビリティ</strong>: クライアント側 DSP でサーバ負荷を抑え、大量処理にも対応可能</li>
              <li>・<strong>API 化の余地</strong>: 分析・導出・DSP をモジュール化しており、REST/Edge 化しやすい設計</li>
            </ul>
          </div>
          {/* 30-year Veteran Message */}
          <div className="mt-12 rounded-xl border border-primary/20 bg-primary/5 p-8 text-center sm:p-12">
            <div className="mb-6 flex justify-center">
              <div className="h-20 w-20 rounded-full border-2 border-primary/30 p-1 flex items-center justify-center bg-background shadow-[0_0_20px_hsl(180_100%_50%/0.15)]">
                <div className="flex flex-col items-center justify-center text-primary leading-none">
                  <span className="text-2xl font-black">30</span>
                  <span className="text-[8px] font-bold uppercase tracking-tighter">Years</span>
                </div>
              </div>
            </div>

            <p className="italic text-foreground/90 leading-relaxed md:text-lg max-w-2xl mx-auto">
              「私は30年間、音作りの現場にいました。世の中の『AIマスタリング』を聴いた時、正直、腹が立ちました。そこには楽曲に対する『愛』も『敬意』もなかったからです。
              イントロの静寂、ブレイクの緊張感、ドロップの爆発。そのすべてに意味があることを、私は知っています。
              だから私は、効率を捨てました。このAIは、私の30年の分身として、あなたの曲の最初から最後までを解析します。
              どうぞ、安心して私に任せてください。」
            </p>

            <div className="mt-8">
              <p className="text-sm font-bold text-foreground">Lead Architect / 30-year Veteran Audio Engineer</p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Founders Message • Engineered in Tokyo</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
