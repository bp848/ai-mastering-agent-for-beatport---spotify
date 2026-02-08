
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { MasteringParams } from '../types';
import { buildMasteringChain } from '../services/audioService';
import { applyFeedbackAdjustment, type FeedbackType } from '../services/feedbackService';
import { Spinner, DownloadIcon, PlayIcon, PauseIcon } from './Icons';
import { useTranslation } from '../contexts/LanguageContext';
import MasteringConsole from './MasteringConsole';
import RetryModal from './RetryModal';

/* ─────────────────────────────────────────────────────────────────
   "Glass Cockpit" — Professional Preview & Comparison Player
   
   Key Features:
   1. Waveform Overlay (gray = original, cyan = mastered)
   2. Hold-to-Compare (press and hold for original)
   3. Gain Reduction Meter
   4. Download with WAV specs
   ───────────────────────────────────────────────────────────────── */

/* ── Waveform Overlay Canvas (Mirrored, instrument-grade) ─── */
const WaveformOverlay: React.FC<{
  originalBuffer: AudioBuffer;
  gainDb: number;
  isHoldingOriginal: boolean;
}> = ({ originalBuffer, gainDb, isHoldingOriginal }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const mid = h / 2;
    const data = originalBuffer.getChannelData(0);
    const step = Math.ceil(data.length / w);
    const gainLinear = Math.pow(10, gainDb / 20);

    // Background
    ctx.fillStyle = '#08080c';
    ctx.fillRect(0, 0, w, h);

    // Center line (細い水平線)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.75;
    ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();

    // Compute min/max per column for original (multiplier 1) and mastered (gainLinear)
    const minsOrig: number[] = [];
    const maxsOrig: number[] = [];
    const minsMaster: number[] = [];
    const maxsMaster: number[] = [];
    for (let x = 0; x < w; x++) {
      const start = x * step;
      let loO = 1, hiO = -1, loM = 1, hiM = -1;
      for (let j = 0; j < step && start + j < data.length; j++) {
        const v = data[start + j];
        const vo = Math.max(-1, Math.min(1, v));
        const vm = Math.max(-1, Math.min(1, v * gainLinear));
        if (vo < loO) loO = vo; if (vo > hiO) hiO = vo;
        if (vm < loM) loM = vm; if (vm > hiM) hiM = vm;
      }
      minsOrig.push(loO); maxsOrig.push(hiO);
      minsMaster.push(loM); maxsMaster.push(hiM);
    }

    const amp = mid * 0.9;

    // 1. Original (背面): ダークグレー #3f3f46 — 常に描画して比較用の影にする
    ctx.fillStyle = '#3f3f46';
    ctx.beginPath();
    ctx.moveTo(0, mid);
    for (let x = 0; x < w; x++) ctx.lineTo(x, mid - maxsOrig[x] * amp);
    ctx.lineTo(w, mid);
    for (let x = w - 1; x >= 0; x--) ctx.lineTo(x, mid - minsOrig[x] * amp);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#52525b';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 2. Mastered (前面): シアン #22d3ee opacity 0.8 — シアンがはみ出れば「音がデカくなった」が一目で分かる
    if (!isHoldingOriginal) {
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.moveTo(0, mid);
      for (let x = 0; x < w; x++) ctx.lineTo(x, mid - maxsMaster[x] * amp);
      ctx.lineTo(w, mid);
      for (let x = w - 1; x >= 0; x--) ctx.lineTo(x, mid - minsMaster[x] * amp);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(34,211,238,0.9)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }, [originalBuffer, gainDb, isHoldingOriginal]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8), 0 4px 24px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Labels */}
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider font-mono transition-all ${
          isHoldingOriginal ? 'bg-white/90 text-black' : 'bg-white/5 text-zinc-400 border border-white/10'
        }`}>
          Original
        </span>
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider font-mono transition-all ${
          !isHoldingOriginal ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.5)]' : 'bg-white/5 text-zinc-400 border border-white/10'
        }`}>
          AI Mastered
        </span>
      </div>
      <canvas ref={canvasRef} className="w-full h-44 sm:h-52 block" />
    </div>
  );
};

/* ── Gain Reduction Meter (リミッター前のサイドチェーン計測) ─────────── */
const GainReductionMeter: React.FC<{
  /** リミッター「前」のレベルを読むサイドチェーン AnalyserNode */
  preLimiterAnalyserRef: React.RefObject<AnalyserNode | null>;
  isPlaying: boolean;
  limiterCeiling: number;
}> = ({ preLimiterAnalyserRef, isPlaying, limiterCeiling }) => {
  const [gr, setGr] = useState(0);
  const dataRef = useRef<Float32Array | null>(null);

  useEffect(() => {
    if (!isPlaying || !preLimiterAnalyserRef.current) { setGr(0); return; }
    const analyser = preLimiterAnalyserRef.current;
    const data = new Float32Array(analyser.fftSize);
    dataRef.current = data;
    let raf = 0;
    const update = () => {
      raf = requestAnimationFrame(update);
      if (!preLimiterAnalyserRef.current || !dataRef.current) return;
      analyser.getFloatTimeDomainData(dataRef.current);
      let max = 0;
      for (let i = 0; i < dataRef.current.length; i++) {
        const v = Math.abs(dataRef.current[i]);
        if (v > max) max = v;
      }
      const preLimiterPeakDb = max <= 1e-6 ? -100 : 20 * Math.log10(max);
      // GR = リミッター前ピーク − シーリング（正の値 = リミッター作動中）
      const reduction = Math.max(0, preLimiterPeakDb - limiterCeiling);
      setGr(reduction);
    };
    update();
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, preLimiterAnalyserRef, limiterCeiling]);

  // Scale: 1dB GR → 8% bar height, max 100%
  const barHeight = Math.min(gr * 8, 100);

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">GR</span>
      <div
        className="relative w-3 h-28 rounded overflow-hidden"
        style={{
          background: '#0a0a0f',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: 'inset 0 0 8px rgba(0,0,0,0.6)',
        }}
      >
        <div
          className="absolute top-0 left-0 w-full rounded-b"
          style={{
            height: `${barHeight}%`,
            transition: 'height 50ms linear',
            background: gr > 3 ? 'linear-gradient(to bottom, #ef4444, #f59e0b)' : 'linear-gradient(to bottom, #f59e0b, #22d3ee)',
            boxShadow: gr > 3 ? '0 0 8px rgba(239,68,68,0.4)' : '0 0 6px rgba(34,211,238,0.2)',
          }}
        />
      </div>
      <span className="text-[11px] font-mono tabular-nums" style={{ color: gr > 3 ? '#ef4444' : gr > 0.1 ? '#f59e0b' : '#a1a1aa' }}>
        {gr > 0.1 ? `-${gr.toFixed(1)}` : '0.0'}
      </span>
    </div>
  );
};

/* ── Live Peak Meter ──────────────────────────────────────── */
const LivePeakMeter: React.FC<{
  analyserRef: React.RefObject<AnalyserNode | null>;
  isPlaying: boolean;
}> = ({ analyserRef, isPlaying }) => {
  const [peakDb, setPeakDb] = useState<number>(-100);
  const dataRef = useRef<Float32Array | null>(null);

  useEffect(() => {
    if (!isPlaying || !analyserRef.current) { setPeakDb(-100); return; }
    const analyser = analyserRef.current;
    const data = new Float32Array(analyser.fftSize);
    dataRef.current = data;
    let raf = 0;
    const update = () => {
      raf = requestAnimationFrame(update);
      if (!analyserRef.current || !dataRef.current) return;
      analyser.getFloatTimeDomainData(dataRef.current);
      let max = 0;
      for (let i = 0; i < dataRef.current.length; i++) {
        const v = Math.abs(dataRef.current[i]);
        if (v > max) max = v;
      }
      setPeakDb(max <= 1e-6 ? -100 : 20 * Math.log10(max));
    };
    update();
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, analyserRef]);

  // Color based on level
  const barPercent = Math.max(0, Math.min(100, (peakDb + 60) * (100 / 60)));
  const color = peakDb > -1 ? 'bg-red-500' : peakDb > -6 ? 'bg-amber-400' : 'bg-cyan-400';

  return (
    <div className="flex items-center gap-2 w-full">
      <span className="text-[11px] font-mono w-12 text-right tabular-nums shrink-0" style={{ color: peakDb > -1 ? '#ef4444' : peakDb > -6 ? '#f59e0b' : '#a1a1aa' }}>
        {peakDb > -100 ? `${peakDb.toFixed(1)}` : '—'} dB
      </span>
      <div
        className="flex-1 h-2 rounded overflow-hidden"
        style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.06)', boxShadow: 'inset 0 0 6px rgba(0,0,0,0.5)' }}
      >
        <div
          className="h-full transition-all duration-75 rounded"
          style={{
            width: `${barPercent}%`,
            background: peakDb > -1
              ? 'linear-gradient(90deg, #22d3ee, #f59e0b, #ef4444)'
              : peakDb > -6
                ? 'linear-gradient(90deg, #22d3ee, #f59e0b)'
                : '#22d3ee',
            boxShadow: peakDb > -6 ? '0 0 6px rgba(34,211,238,0.3)' : 'none',
          }}
        />
      </div>
    </div>
  );
};

/* ── Main Component Props ────────────────────────────────── */
interface MasteringAgentProps {
  params: MasteringParams | null;
  isLoading: boolean;
  onDownloadMastered: () => void;
  isProcessingAudio: boolean;
  audioBuffer: AudioBuffer | null;
  hideDownloadButton?: boolean;
  /** Human-in-the-Loop: フィードバックに基づきパラメータを補正して再レンダリング */
  onFeedbackApply?: (newParams: MasteringParams) => void;
  language?: 'ja' | 'en';
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function estimateMasteredWavBytes(buffer: AudioBuffer): number {
  return buffer.length * buffer.numberOfChannels * 2 + 44;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/* ── AudioPreview ────────────────────────────────────────── */
const AudioPreview: React.FC<{
  audioBuffer: AudioBuffer;
  params: MasteringParams;
}> = ({ audioBuffer, params }) => {
  const { language } = useTranslation();
  const ja = language === 'ja';
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHoldingOriginal, setIsHoldingOriginal] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  /** GR メーター用: リミッター「前」の信号レベルを計測するサイドチェーン */
  const grAnalyserRef = useRef<AnalyserNode | null>(null);
  const nodesRef = useRef<{ bypassGain: GainNode | null; masteredGain: GainNode | null }>({ bypassGain: null, masteredGain: null });
  /** スペクトラム用: グラフ準備完了で MasteringConsole が描画を開始できる */
  const [graphReady, setGraphReady] = useState(false);

  const setupAudioGraph = useCallback(() => {
    if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close().catch(() => {});
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = context;

    // ── Main output analyser (post-limiter) ──
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    analyserRef.current = analyser;

    const bypassGain = context.createGain();
    const masteredGain = context.createGain();
    bypassGain.connect(analyser);
    masteredGain.connect(analyser);
    analyser.connect(context.destination);

    bypassGain.gain.value = isHoldingOriginal ? 1.0 : 0.0;
    masteredGain.gain.value = isHoldingOriginal ? 0.0 : 1.0;

    const source = context.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = true;
    source.connect(bypassGain);

    // ── GR sidechain: source → inputGain → grAnalyser → silence → destination ──
    // リミッター前の推定レベル = 原音 × ゲイン で近似。
    // 出力は mute（0 gain）して destination に繋ぐ（AudioNode が処理されるために必要）。
    const grAnalyser = context.createAnalyser();
    grAnalyser.fftSize = 2048;
    grAnalyserRef.current = grAnalyser;

    const scGain = context.createGain();
    scGain.gain.value = Math.pow(10, params.gain_adjustment_db / 20);
    const silentGain = context.createGain();
    silentGain.gain.value = 0; // Muted — 音は出さない

    source.connect(scGain);
    scGain.connect(grAnalyser);
    grAnalyser.connect(silentGain);
    silentGain.connect(context.destination);

    // ── Mastering DSP chain ──
    buildMasteringChain(context, source, params, audioBuffer.numberOfChannels, masteredGain);

    sourceRef.current = source;
    nodesRef.current = { bypassGain, masteredGain };
    setGraphReady(true);
  }, [audioBuffer, params, isHoldingOriginal]);

  useEffect(() => {
    if (!isPlaying) {
      setGraphReady(false);
      setupAudioGraph();
    }
  }, [audioBuffer, params, isPlaying, setupAudioGraph]);

  useEffect(() => {
    return () => {
      try { sourceRef.current?.stop(); } catch (_) {}
      audioContextRef.current?.close?.();
    };
  }, []);

  // Hold-to-Compare: crossfade
  useEffect(() => {
    if (nodesRef.current.bypassGain && nodesRef.current.masteredGain && audioContextRef.current) {
      const now = audioContextRef.current.currentTime;
      nodesRef.current.bypassGain.gain.setTargetAtTime(isHoldingOriginal ? 1.0 : 0.0, now, 0.05);
      nodesRef.current.masteredGain.gain.setTargetAtTime(isHoldingOriginal ? 0.0 : 1.0, now, 0.05);
    }
  }, [isHoldingOriginal]);

  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      try { sourceRef.current?.stop(); } catch (_) {}
      setIsPlaying(false);
      return;
    }
    setupAudioGraph();
    const ctx = audioContextRef.current;
    const src = sourceRef.current;
    if (!ctx || !src) return;
    if (ctx.state === 'suspended') await ctx.resume();
    try {
      src.start(0);
      setIsPlaying(true);
    } catch (_) {
      setupAudioGraph();
      const retry = sourceRef.current;
      if (retry) { retry.start(0); setIsPlaying(true); }
    }
  }, [isPlaying, setupAudioGraph]);

  const estimatedSize = formatBytes(estimateMasteredWavBytes(audioBuffer));
  const duration = formatDuration(audioBuffer.duration);

  return (
    <div className="space-y-5">
      {/* ── Waveform Overlay ── */}
      <WaveformOverlay
        originalBuffer={audioBuffer}
        gainDb={params.gain_adjustment_db}
        isHoldingOriginal={isHoldingOriginal}
      />

      {/* ── Meters Row ── */}
      <div className="flex items-stretch gap-3">
        {/* Peak + Level Meter */}
        <div className="flex-1 space-y-2">
          <LivePeakMeter analyserRef={analyserRef} isPlaying={isPlaying} />
          <p className="text-[12px] text-zinc-400 font-mono">
            {ja ? 'リアルタイム ピーク' : 'Real-time Peak'}
          </p>
        </div>
        {/* GR Meter (sidechain: pre-limiter level) */}
        <GainReductionMeter
          preLimiterAnalyserRef={grAnalyserRef}
          isPlaying={isPlaying}
          limiterCeiling={params.limiter_ceiling_db}
        />
      </div>

      {/* ── 一枚のガラス製コンソール（ベジェ曲線・スペクトラム＋M/S 統合） ── */}
      <MasteringConsole analyserRef={analyserRef} isPlaying={isPlaying} graphReady={graphReady} />

      {/* ── Controls (VST-style) ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Play */}
        <button
          onClick={togglePlay}
          className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 transition-all touch-manipulation shrink-0"
          style={{
            background: isPlaying ? 'rgba(255,255,255,0.1)' : '#22d3ee',
            color: isPlaying ? '#22d3ee' : '#000',
            boxShadow: isPlaying
              ? 'inset 0 0 10px rgba(0,0,0,0.4), 0 0 15px rgba(34,211,238,0.15)'
              : '0 0 20px rgba(34,211,238,0.3), 0 4px 12px rgba(0,0,0,0.4)',
            border: isPlaying ? '1px solid rgba(34,211,238,0.3)' : 'none',
          }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          <span className="w-6 h-6">{isPlaying ? <PauseIcon /> : <PlayIcon />}</span>
        </button>

        {/* Hold-to-Compare */}
        <button
          onMouseDown={() => setIsHoldingOriginal(true)}
          onMouseUp={() => setIsHoldingOriginal(false)}
          onMouseLeave={() => setIsHoldingOriginal(false)}
          onTouchStart={(e) => { e.preventDefault(); setIsHoldingOriginal(true); }}
          onTouchEnd={(e) => { e.preventDefault(); setIsHoldingOriginal(false); }}
          onTouchCancel={() => setIsHoldingOriginal(false)}
          onContextMenu={(e) => e.preventDefault()}
          className="flex-1 w-full sm:w-auto px-6 py-3.5 rounded-xl font-mono text-[10px] uppercase tracking-[0.15em] select-none transition-all touch-manipulation"
          style={{
            background: isHoldingOriginal ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
            border: isHoldingOriginal ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.08)',
            color: isHoldingOriginal ? '#fff' : '#71717a',
            boxShadow: isHoldingOriginal ? 'inset 0 0 20px rgba(255,255,255,0.05)' : 'none',
          }}
        >
          {ja ? '長押しでオリジナルと比較' : 'Hold to Compare Original'}
        </button>
      </div>

      {/* ── Module Badges (機材ラック風: LABEL | VALUE) ── */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
        <p className="text-[12px] font-bold text-zinc-300 uppercase tracking-widest font-mono">
          {ja ? '適用済みモジュール' : 'Active Modules'}
        </p>
        <div className="flex flex-wrap gap-0">
          {[
            { label: 'TUBE SAT', value: params.tube_drive_amount.toFixed(1) },
            { label: 'PULTEC EQ', value: 'ON' },
            { label: 'EQ', value: `${params.eq_adjustments.length}-BAND` },
            { label: 'EXCITER', value: params.exciter_amount.toFixed(2) },
            { label: 'M/S WIDTH', value: `${params.width_amount.toFixed(2)}x` },
            { label: 'GLUE COMP', value: 'ON' },
            { label: 'NEURO-DRIVE', value: '35%' },
            { label: 'SOFT CLIP', value: 'ON' },
            { label: 'LIMITER', value: `${params.limiter_ceiling_db.toFixed(1)} dB` },
          ].map(mod => (
            <span key={mod.label} className="module-badge">
              {mod.label} <span className="opacity-80">|</span> <span className="font-bold tabular-nums">{mod.value}</span>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-4 text-[12px] font-mono text-zinc-400 pt-2 border-t border-white/5">
          <span>WAV 16bit / 44.1kHz</span>
          <span>{duration}</span>
          <span>{estimatedSize}</span>
        </div>
      </div>
    </div>
  );
};

/* ── Main Exported Component ─────────────────────────────── */
const MasteringAgent: React.FC<MasteringAgentProps> = ({
  params,
  isLoading,
  onDownloadMastered,
  isProcessingAudio,
  audioBuffer,
  hideDownloadButton = false,
  onFeedbackApply,
  language: languageProp,
}) => {
  const { language: contextLang } = useTranslation();
  const language = languageProp ?? contextLang;
  const ja = language === 'ja';
  const [isRetryOpen, setIsRetryOpen] = useState(false);

  const handleRetry = useCallback(
    async (feedback: FeedbackType) => {
      if (!params || !onFeedbackApply) return;
      setIsRetryOpen(false);
      await new Promise((r) => setTimeout(r, 800));
      const newParams = applyFeedbackAdjustment(params, feedback);
      onFeedbackApply(newParams);
    },
    [params, onFeedbackApply],
  );

  if (isLoading || !params) return null;

  return (
    <div className="space-y-6">
      {audioBuffer && <AudioPreview audioBuffer={audioBuffer} params={params} />}

      {onFeedbackApply && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsRetryOpen(true)}
            className="text-[14px] text-zinc-300 hover:text-cyan-400 flex items-center gap-1.5 transition-colors underline decoration-dotted underline-offset-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            <span>{ja ? '仕上がりに満足できませんか？ AIにフィードバックを送る' : 'Not satisfied? Send feedback to AI'}</span>
          </button>
        </div>
      )}

      <RetryModal
        isOpen={isRetryOpen}
        onClose={() => setIsRetryOpen(false)}
        onRetry={handleRetry}
        language={language}
      />

      {!hideDownloadButton && (
        <button
          onClick={onDownloadMastered}
          disabled={isProcessingAudio}
          className="w-full flex items-center justify-center gap-3 py-4 px-6 min-h-[52px] rounded-xl font-bold text-base active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all touch-manipulation"
          style={{
            background: 'linear-gradient(135deg, #22d3ee, #06b6d4)',
            color: '#000',
            boxShadow: '0 0 20px rgba(34,211,238,0.25), 0 4px 16px rgba(0,0,0,0.4)',
            border: 'none',
          }}
        >
          {isProcessingAudio ? (
            <>
              <Spinner />
              <span>{ja ? '書き出し中...' : 'Exporting...'}</span>
            </>
          ) : (
            <>
              <DownloadIcon />
              <span>{ja ? 'WAV をダウンロード' : 'Download WAV'}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default MasteringAgent;
