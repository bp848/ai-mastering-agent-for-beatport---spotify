import React from 'react';

/* ─────────────────────────────────────────────────────────────────
   HeroEngine — Conversion-focused Landing Section
   Designed for first-time visitors: hook -> value -> social proof -> CTA
   ───────────────────────────────────────────────────────────────── */

interface HeroEngineProps {
  language: 'ja' | 'en';
  compact?: boolean;
  onScrollToUpload?: () => void;
}

const STATS = {
  ja: [
    { value: '-8.0', unit: 'LUFS', label: 'Beatport配信基準' },
    { value: '0.1', unit: 'dB', label: '自動補正精度' },
    { value: '30', unit: '秒', label: '解析完了まで' },
  ],
  en: [
    { value: '-8.0', unit: 'LUFS', label: 'Beatport Standard' },
    { value: '0.1', unit: 'dB', label: 'Auto-correction' },
    { value: '30', unit: 'sec', label: 'Analysis Time' },
  ],
};

const STEPS = {
  ja: [
    { num: '01', title: 'アップロード', desc: 'WAV/MP3をドラッグ&ドロップ' },
    { num: '02', title: 'AI解析', desc: 'LUFS・周波数・位相を即座に診断' },
    { num: '03', title: 'マスタリング', desc: 'AIが最適パラメータを算出・適用' },
    { num: '04', title: '試聴・購入', desc: '無料で試聴、気に入ったらDL' },
  ],
  en: [
    { num: '01', title: 'Upload', desc: 'Drag & drop WAV/MP3' },
    { num: '02', title: 'AI Analysis', desc: 'Instant LUFS, spectrum & phase diagnosis' },
    { num: '03', title: 'Mastering', desc: 'AI calculates & applies optimal params' },
    { num: '04', title: 'Listen & Get', desc: 'Free preview, purchase if you like it' },
  ],
};

const ENGINES = {
  ja: [
    { title: 'Self-Correction Loop', desc: 'AIの提案を物理シミュレーションで検証。0.1dB単位で自動補正。' },
    { title: 'Tube Saturation', desc: '真空管回路の偶数倍音で、デジタルの冷たさを排除。' },
    { title: 'Neuro-Drive Module', desc: '並列圧縮+Air帯域ブーストで空間密度を最大化。' },
    { title: 'Transient Shaper', desc: 'ソフトクリッパーでアタック保護、立体的な音像を実現。' },
  ],
  en: [
    { title: 'Self-Correction Loop', desc: 'Validates AI proposals via physics simulation. Auto-corrects to 0.1dB.' },
    { title: 'Tube Saturation', desc: 'Even-order harmonics from tube circuits eliminate digital coldness.' },
    { title: 'Neuro-Drive Module', desc: 'Parallel compression + Air band boost maximizes spatial density.' },
    { title: 'Transient Shaper', desc: 'Soft clipper preserves attack transients for 3D sonic image.' },
  ],
};

const HeroEngine: React.FC<HeroEngineProps> = ({ language, compact = false, onScrollToUpload }) => {
  const ja = language === 'ja';
  const stats = STATS[language];
  const steps = STEPS[language];
  const engines = ENGINES[language];

  if (compact) {
    return (
      <section className="animate-fade-up">
        <div className="rounded-2xl border border-border p-5 sm:p-6 space-y-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
          {/* Free badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/30">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-bold text-success uppercase tracking-wider">
              {ja ? '無料で試聴可能' : 'Free Preview'}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight leading-tight text-balance">
            {ja ? (
              <>
                あなたの楽曲を
                <br />
                <span className="text-primary">世界配信基準</span>に。
              </>
            ) : (
              <>
                Master your tracks to
                <br />
                <span className="text-primary">world standards.</span>
              </>
            )}
          </h2>

          <p className="text-sm leading-relaxed text-muted-foreground">
            {ja
              ? 'AIが楽曲を解析し、Beatport/Spotify配信基準のマスタリングを自動実行。ログイン不要で試聴まで無料。'
              : 'AI analyzes your track and auto-masters to Beatport/Spotify standards. Free preview, no sign-in required.'}
          </p>

          {/* Mini stats */}
          <div className="flex gap-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-lg font-bold font-mono text-foreground stat-number">{s.value}<span className="text-xs text-muted-foreground ml-0.5">{s.unit}</span></p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="animate-fade-up space-y-16">
      {/* ── Hero Above the Fold ── */}
      <div className="hero-gradient rounded-3xl px-6 sm:px-12 py-12 sm:py-20 text-center space-y-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-semibold text-primary tracking-wide">
            {ja ? 'Beatport / Spotify 配信基準対応' : 'Beatport / Spotify Distribution Standard'}
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight leading-[1.15] text-balance max-w-3xl mx-auto">
          {ja ? (
            <>
              AIが、あなたの楽曲を
              <br />
              <span className="text-primary">世界最高峰の音</span>に仕上げる。
            </>
          ) : (
            <>
              AI masters your tracks to
              <br />
              <span className="text-primary">world-class sound.</span>
            </>
          )}
        </h1>

        {/* Subline */}
        <p className="text-base sm:text-lg text-secondary-foreground max-w-2xl mx-auto leading-relaxed text-pretty">
          {ja
            ? '音源をアップロードするだけ。AIが周波数・音圧・位相を解析し、配信基準に最適化されたマスタリングを自動実行します。ログイン不要で試聴まで完全無料。'
            : 'Just upload your track. AI analyzes frequency, loudness & phase, then auto-masters to distribution standards. Free preview with no sign-in required.'}
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={onScrollToUpload}
            className="btn-primary text-base px-8 py-4"
          >
            {ja ? '無料で音源を解析する' : 'Analyze Your Track Free'}
          </button>
          <span className="text-xs text-muted-foreground">
            {ja ? 'WAV / MP3 / AIFF 対応' : 'WAV / MP3 / AIFF supported'}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-8 sm:gap-16 pt-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl sm:text-3xl font-extrabold font-mono text-foreground stat-number">
                {s.value}<span className="text-sm text-muted-foreground ml-1">{s.unit}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Social Proof / Trust ── */}
      <div className="text-center space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {ja ? 'エンジン技術' : 'Engine Technology'}
        </p>
        <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap">
          {['EBU R128', 'Tube Saturation', 'Pultec EQ', 'Neuro-Drive', 'Brickwall Limiter'].map((tech) => (
            <span key={tech} className="text-sm font-mono text-muted-foreground/60 tracking-wide">{tech}</span>
          ))}
        </div>
      </div>

      {/* ── How It Works (4 Steps) ── */}
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest">
            {ja ? '使い方' : 'How It Works'}
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {ja ? '4ステップで完了' : '4 Simple Steps'}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step) => (
            <div key={step.num} className="group relative rounded-2xl border border-border p-6 hover:border-primary/30 transition-colors" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <span className="text-3xl font-extrabold font-mono text-primary/20 absolute top-4 right-4">{step.num}</span>
              <h3 className="text-sm font-bold text-foreground mb-2">{step.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Engine Features ── */}
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest">
            {ja ? 'コア技術' : 'Core Technology'}
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {ja ? 'Hybrid-Analog Engine' : 'Hybrid-Analog Engine'}
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            {ja
              ? 'AIの感性と物理シミュレーションの融合。プリセットに頼らない、楽曲固有の最適化。'
              : 'AI sensibility meets physics simulation. Track-specific optimization, not preset-based.'}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {engines.map((eng) => (
            <div key={eng.title} className="rounded-2xl border border-border p-6 hover:border-primary/30 transition-colors" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <h3 className="text-sm font-bold text-foreground mb-2 font-mono">{eng.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{eng.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Final CTA ── */}
      <div className="text-center space-y-4 pb-4">
        <p className="text-xs text-muted-foreground">
          {ja
            ? 'ログイン不要で試聴まで無料。気に入ったらダウンロードのときだけログイン。'
            : 'Free preview with no sign-in. Only sign in when you download.'}
        </p>
        <button
          type="button"
          onClick={onScrollToUpload}
          className="btn-primary"
        >
          {ja ? '今すぐ無料で試す' : 'Try Free Now'}
        </button>
      </div>
    </section>
  );
};

export default HeroEngine;
