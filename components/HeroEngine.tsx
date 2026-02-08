
import React from 'react';

/* ─────────────────────────────────────────────────────────────────
   HeroEngine — ランディングセクション
   セミプロ / プロ向けの技術的信頼感を与えるエンジン解説。
   ファイル未アップロード時に表示。

   4つの価値軸: 音量・音質・音圧・音像
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
              ? 'AIの感性と、物理学の絶対領域。'
              : 'AI Sensibility \u00D7 The Absolute Domain of Physics.'}
          </span>
        </h2>

        {/* Lead */}
        <div className="max-w-4xl mx-auto space-y-3">
          <p className="text-sm sm:text-[15px] leading-relaxed text-zinc-400">
            {ja
              ? '既存のAIマスタリングは、プリセットを当てはめて「平均的な音」を作るだけでした。それでは世界観が小さくまとまってしまいます。'
              : 'Existing AI mastering just applies presets to produce "average sound." That only shrinks your creative vision.'}
          </p>
          <p className="text-sm sm:text-[15px] leading-relaxed text-zinc-300 font-medium">
            {ja
              ? '我々のエンジンは違います。目指したのは、特定のチャートへの迎合ではなく、世界最高峰のスタジオ品質に負けない「音量」「音質」「音圧」、そして明確な「音像」です。'
              : 'Our engine is different. We don\u2019t chase charts \u2014 we pursue world-class studio quality: Volume, Tone, Loudness, and a definitive Sonic Image.'}
          </p>
          <p className="text-sm sm:text-[15px] leading-relaxed text-zinc-400">
            {ja
              ? 'AIが楽曲のDNAを解析し、独自開発のハイブリッド・ループシステムが、楽曲の持つそれぞれの特徴を最大限に引き出します。'
              : 'AI analyzes your track\u2019s DNA, and our proprietary hybrid-loop system unlocks the full potential of every characteristic your music holds.'}
          </p>
        </div>

        {/* 4 Pillars */}
        <div className="flex items-center justify-center gap-3 sm:gap-5 flex-wrap">
          {(ja
            ? ['音量', '音質', '音圧', '音像']
            : ['Volume', 'Tone', 'Loudness', 'Image']
          ).map((pillar) => (
            <span
              key={pillar}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs sm:text-sm font-bold text-cyan-300 tracking-wider"
            >
              {pillar}
            </span>
          ))}
        </div>

        {/* Signal flow mini-diagram */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap text-[9px] sm:text-[10px] font-mono text-zinc-500 select-none pt-2">
          {[
            'Upload',
            'Python Analysis',
            'AI (Gemini)',
            'Self-Correction',
            'DSP Chain',
            'Neuro-Drive',
            'Preview / Export',
          ].map((step, i, arr) => (
            <React.Fragment key={step}>
              <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
                {step}
              </span>
              {i < arr.length - 1 && <span className="text-cyan-600">&rarr;</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Tech Specs Grid ──────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        <SpecCard
          number="1"
          title={ja ? '自己補正ループ' : 'Self-Correction Loop'}
          titleEn="Self-Correction Loop"
          body={
            ja
              ? 'AIが提案したパラメータを盲信しません。システムが適用結果を瞬時にシミュレーションし、目標値との誤差を 0.1 dB 単位で検知・修正。単に音を大きくするのではなく、その楽曲が持つ本来のダイナミクス（抑揚）を崩さずに、最適なバランスに着地させる。「AIが提案し、物理演算が承認する」— プロのエンジニアの繊細な判断をコードレベルで再現しています。'
              : 'We never blindly trust AI proposals. The system instantly simulates the result, detecting deviation down to 0.1 dB and correcting it. Rather than simply making it louder, it preserves the track\u2019s original dynamics while landing at the optimal balance. "AI proposes, physics approves" \u2014 a pro engineer\u2019s nuanced judgment, replicated in code.'
          }
        />
        <SpecCard
          number="2"
          title={ja ? '真空管サチュレーション' : 'Tube & Tape Saturation'}
          titleEn="Tube & Tape Saturation"
          body={
            ja
              ? 'デジタルの冷たさを排除し、世界最高峰の「音質」へ。偶数倍音を付加する真空管回路と、磁気テープのヒステリシスをシミュレート。単なる信号増幅ではなく、音に「粘り」と「重量」といった物質感を与えます。これにより、楽曲はデジタルデータから、手触りのある「実在する音」へと変化します。'
              : 'Eliminating digital coldness for world-class tone. Our tube circuit adds even-order harmonics while simulating magnetic tape hysteresis. This isn\u2019t mere signal amplification \u2014 it gives sound tangible "weight" and "texture," transforming digital data into a physical, living presence.'
          }
        />
        <SpecCard
          number="3"
          title={ja ? '"Pultec" ロースタイル' : '"Pultec" Style Low-End'}
          titleEn="Pultec Style Low-End"
          body={
            ja
              ? 'EQでブーストするだけでは、濁りが生じて世界観が狭くなります。名機 Pultec EQ のカーブ特性を再現し、不要なサブベース（30 Hz 以下）をカットしながら、その直上の帯域をレゾナンスで音楽的に強調。キックとベースの分離感を保ちながら、フロアの空気を震わせる「音圧」と、どこまでも深く沈み込むような「深度」を両立します。'
              : 'Simply boosting low-end with EQ creates muddiness and shrinks the soundstage. We replicate the legendary Pultec EQ curve: cutting unnecessary sub-bass below 30 Hz while resonantly emphasizing the band just above it. Maintaining kick-bass separation while delivering floor-shaking loudness and bottomless depth.'
          }
        />
        <SpecCard
          number="4"
          title={ja ? 'トランジェント・シェイパー & クリッパー' : 'Transient Shaper & Clipper'}
          titleEn="Transient Shaper & Clipper"
          body={
            ja
              ? 'リミッターで潰れた平坦な音は作りません。重要なのは「音像（輪郭）」です。我々のエンジンは、リミッターの前段でソフトクリッパー処理を実行。人間の耳には聞こえないピークだけを瞬時に削り取り、アタック感（トランジェント）を鋭く保護します。これにより、圧倒的な音量を稼ぎながらも、音がリスナーの目の前に飛び出してくるような、鋭利で立体的なサウンドを実現します。'
              : 'We don\u2019t create flat, crushed sound from limiters. What matters is the sonic image \u2014 the contour. Our engine runs soft-clipper processing before the limiter, shaving only inaudible peaks while sharply preserving attack transients. The result: overwhelming volume with sound that leaps out at the listener \u2014 razor-sharp and three-dimensional.'
          }
        />
        <SpecCard
          number="5"
          title={ja ? 'Neuro-Drive Module（脳内駆動エンジン）' : 'Neuro-Drive Module'}
          titleEn="Parallel Hyper-Compression + Air Exciter"
          body={
            ja
              ? '楽曲のスケールを決定づける「空間」の拡張。信号を極限まで圧縮した音を並列生成し、低域の干渉を排除した上で、12kHz 以上の Air 帯域（空気感）をブースト。これを原音に絶妙なバランスでミックスすることで、天井知らずの「開放感」と、脳を刺激するエネルギー密度を注入。楽曲が本来持っているポテンシャルを解放し、没入感あふれる世界観を構築します。'
              : 'Expanding the "space" that defines a track\u2019s scale. A hyper-compressed parallel signal is generated, filtered to eliminate low-end interference, then boosted above 12kHz in the Air band. Mixed at the perfect balance into the dry signal, it injects limitless openness and brain-stimulating energy density \u2014 unlocking the full potential of your music and building an immersive sonic universe.'
          }
        />
      </div>

      {/* ── CTA hint ─────────────────────────────────────── */}
      <p className="text-center text-xs text-zinc-600">
        {ja
          ? '\u2191 \u4E0A\u306E\u30C9\u30ED\u30C3\u30D7\u30A8\u30EA\u30A2\u306B\u30C8\u30E9\u30C3\u30AF\u3092\u6295\u5165\u3059\u308B\u3068\u3001\u3053\u306E\u30A8\u30F3\u30B8\u30F3\u304C\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u3067\u8D77\u52D5\u3057\u307E\u3059\u3002'
          : '\u2191 Drop a track in the area above to activate this engine in real time.'}
      </p>
    </section>
  );
};

export default HeroEngine;
