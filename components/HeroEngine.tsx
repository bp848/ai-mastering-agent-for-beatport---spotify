
import React from 'react';

/* ─────────────────────────────────────────────────────────────────
   HeroEngine — ランディングセクション
   セミプロ / プロ向けの技術的信頼感を与えるエンジン解説。
   ファイル未アップロード時に表示。
   ───────────────────────────────────────────────────────────────── */

interface SpecCardProps {
  number: string;
  title: string;
  titleEn: string;
  body: string;
}

const SpecCard: React.FC<SpecCardProps> = ({ number, title, titleEn, body }) => (
  <div className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6 hover:border-cyan-500/30 transition-colors">
    {/* Number badge */}
    <span className="absolute -top-3 left-4 inline-flex items-center justify-center w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-bold ring-1 ring-cyan-500/30">
      {number}
    </span>
    <h3 className="text-sm font-bold text-white leading-snug mb-0.5">{title}</h3>
    <p className="text-[10px] font-medium text-cyan-500/70 tracking-wider uppercase mb-3">{titleEn}</p>
    <p className="text-xs leading-relaxed text-zinc-400">{body}</p>
  </div>
);

interface HeroEngineProps {
  language: 'ja' | 'en';
}

const HeroEngine: React.FC<HeroEngineProps> = ({ language }) => {
  const ja = language === 'ja';

  return (
    <section className="animate-fade-up space-y-8">
      {/* ── Hero Header ──────────────────────────────────── */}
      <div className="glass rounded-2xl p-6 sm:p-10 text-center space-y-5">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-widest">
            {ja ? 'エンジン技術解説' : 'Engine Architecture'}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
          <span className="text-cyan-400">&quot;Hybrid-Analog Engine&quot;</span>
          <br />
          <span className="text-base sm:text-lg font-semibold text-zinc-300">
            {ja
              ? 'AI\u306E\u611F\u6027\u3068\u30A2\u30EB\u30B4\u30EA\u30BA\u30E0\u306E\u7CBE\u5EA6'
              : 'AI Sensibility \u00D7 Algorithmic Precision'}
          </span>
        </h2>

        {/* Lead */}
        <p className="max-w-2xl mx-auto text-sm sm:text-[15px] leading-relaxed text-zinc-400">
          {ja
            ? '既存のAIマスタリングは、プリセットを当てはめるだけでした。我々のエンジンは違います。AIが楽曲の「方向性（Vibe）」を決定し、独自開発のアルゴリズムが「音圧（Physics）」を数理的に保証するハイブリッド・ループシステムを採用。Beatport Top 100のサウンドをWebブラウザ上でリアルタイムに再構築します。'
            : 'Existing AI mastering just applies presets. Our engine is different. AI determines the track\u2019s \u201Cvibe,\u201D while our proprietary algorithm mathematically guarantees loudness targets\u2014a hybrid feedback loop that reconstructs Beatport Top 100 sound in real time, right in your browser.'}
        </p>

        {/* Signal flow mini-diagram */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap text-[9px] sm:text-[10px] font-mono text-zinc-500 select-none">
          {[
            'Upload',
            'Python Analysis',
            'AI (Gemini)',
            'Self-Correction',
            'DSP Chain',
            'Preview / Export',
          ].map((step, i, arr) => (
            <React.Fragment key={step}>
              <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
                {step}
              </span>
              {i < arr.length - 1 && <span className="text-cyan-600">→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Tech Specs Grid ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        <SpecCard
          number="1"
          title={ja ? '自己補正ループ' : 'Self-Correction Loop'}
          titleEn="Self-Correction Loop"
          body={
            ja
              ? 'AIが提案したパラメータを盲信しません。システムが適用結果を瞬時にシミュレーションし、目標とする音圧（LUFS）との誤差を 0.1 dB 単位で検知。「AIが提案し、アルゴリズムが修正する」— プロのエンジニアのワークフローをコードレベルで再現しています。'
              : 'We never blindly trust AI proposals. The system instantly simulates the result, detecting LUFS deviation down to 0.1 dB. "AI proposes, the algorithm corrects" \u2014 a pro engineer\u2019s workflow, replicated in code.'
          }
        />
        <SpecCard
          number="2"
          title={ja ? '真空管サチュレーション' : 'Tube & Tape Saturation'}
          titleEn="Tube & Tape Saturation"
          body={
            ja
              ? 'デジタルの冷たさを排除するため、偶数倍音を付加する真空管シミュレーション回路を搭載。単に音を大きくするのではなく、RMS（音の密度）を稼ぎ、アナログコンソールを通したような「太さ」を与えます。'
              : 'To eliminate digital harshness, our tube simulation circuit adds even-order harmonics. Instead of just making it louder, it increases RMS density \u2014 delivering the "fatness" of an analog console.'
          }
        />
        <SpecCard
          number="3"
          title={ja ? '"Pultec" ロースタイル' : '"Pultec" Style Low-End'}
          titleEn="Pultec Style Low-End"
          body={
            ja
              ? 'EQで低域を上げるだけでは音圧は稼げません。名機 Pultec EQ のカーブを再現し、不要なサブベース（30 Hz 以下）をカットしながら、その直上のキックの胴鳴り（60 Hz 付近）をレゾナンスで強調。クラブのサウンドシステムで最も心地よく響く低域を作ります。'
              : 'Simply boosting low-end with EQ won\u2019t increase loudness. We replicate the legendary Pultec EQ curve: cutting unnecessary sub-bass below 30 Hz while resonantly emphasizing the kick body around 60 Hz \u2014 crafting low-end that hits perfectly on club sound systems.'
          }
        />
        <SpecCard
          number="4"
          title={ja ? 'トランジェント・シェイパー & クリッパー' : 'Transient Shaper & Clipper'}
          titleEn="Transient Shaper & Clipper"
          body={
            ja
              ? 'リミッターだけで音圧を稼ごうとすると、音が潰れて平坦になります。我々のエンジンは、リミッターの前段にソフトクリッパーを配置。人間の耳には聞こえないピークを一瞬で削り取ることで、パンチ感を損なわずに Extreme な音圧レベルを実現します。'
              : 'Relying solely on a limiter for loudness crushes dynamics flat. Our engine places a soft clipper before the limiter, shaving inaudible peaks instantly \u2014 achieving extreme loudness levels without sacrificing punch.'
          }
        />
      </div>

      {/* ── CTA hint ─────────────────────────────────────── */}
      <p className="text-center text-xs text-zinc-600">
        {ja
          ? '↑ 上のドロップエリアにトラックを投入すると、このエンジンがリアルタイムで起動します。'
          : '\u2191 Drop a track in the area above to activate this engine in real time.'}
      </p>
    </section>
  );
};

export default HeroEngine;
