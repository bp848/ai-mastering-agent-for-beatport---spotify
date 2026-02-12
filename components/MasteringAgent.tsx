
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { MasteringParams } from '../types';
import { buildMasteringChain, optimizeMasteringParams } from '../services/audioService';
import { applyFeedbackAdjustment, type FeedbackType } from '../services/feedbackService';
import { clampMasteringParams } from '../services/geminiService';
import { Spinner, DownloadIcon, CardIcon, PlayIcon, PauseIcon } from './Icons';
import { useTranslation } from '../contexts/LanguageContext';
import RetryModal from './RetryModal';

/* ─────────────────────────────────────────────────────────────────
   "Glass Cockpit" — Professional Preview & Comparison Player
   
   Key Features:
   1. Waveform Overlay (gray = original, cyan = mastered)
   2. Hold-to-Compare (press and hold for original)
   3. Gain Reduction Meter
   4. Download with WAV specs
   ───────────────────────────────────────────────────────────────── */

/* ── Waveform Overlay: Before/After 収録用。常に両波形表示・高解像・スムーズ描画 ─── */
const SMOOTH_RADIUS = 2;
function smoothBins(arr: number[], radius: number): number[] {
  if (radius < 1) return arr;
  const out: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    let sum = 0, count = 0;
    for (let r = -radius; r <= radius; r++) {
      const j = i + r;
      if (j >= 0 && j < arr.length) { sum += arr[j]; count++; }
    }
    out.push(count ? sum / count : arr[i]);
  }
  return out;
}

const WaveformOverlay: React.FC<{
  originalBuffer: AudioBuffer;
  gainDb: number;
  isHoldingOriginal: boolean;
  /** 再生位置（秒）。未再生時は null */
  playbackPositionSec: number | null;
}> = ({ originalBuffer, gainDb, isHoldingOriginal, playbackPositionSec }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const durationSec = originalBuffer.duration;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const mid = h / 2;
    const data = originalBuffer.getChannelData(0);
    const numBins = Math.min(Math.max(Math.floor(w * 4), 1024), 8192);
    const step = data.length / numBins;
    const gainLinear = Math.pow(10, gainDb / 20);

    const maxsOrig: number[] = [];
    const minsOrig: number[] = [];
    const maxsMaster: number[] = [];
    const minsMaster: number[] = [];
    for (let i = 0; i < numBins; i++) {
      const start = Math.floor(i * step);
      const end = Math.min(Math.floor((i + 1) * step), data.length);
      let loO = 1, hiO = -1, loM = 1, hiM = -1;
      for (let j = start; j < end; j++) {
        const v = data[j];
        const vo = Math.max(-1, Math.min(1, v));
        const vm = Math.max(-1, Math.min(1, v * gainLinear));
        if (vo < loO) loO = vo; if (vo > hiO) hiO = vo;
        if (vm < loM) loM = vm; if (vm > hiM) hiM = vm;
      }
      minsOrig.push(loO); maxsOrig.push(hiO);
      minsMaster.push(loM); maxsMaster.push(hiM);
    }
    const smoothMaxO = smoothBins(maxsOrig, SMOOTH_RADIUS);
    const smoothMinO = smoothBins(minsOrig, SMOOTH_RADIUS);
    const smoothMaxM = smoothBins(maxsMaster, SMOOTH_RADIUS);
    const smoothMinM = smoothBins(minsMaster, SMOOTH_RADIUS);

    const amp = mid * 0.92;

    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(w, mid);
    ctx.stroke();

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const drawShape = (maxs: number[], mins: number[]) => {
      ctx.beginPath();
      ctx.moveTo(0, mid - maxs[0] * amp);
      for (let i = 1; i < numBins; i++) {
        const x = (i / (numBins - 1)) * w;
        ctx.lineTo(x, mid - maxs[i] * amp);
      }
      for (let i = numBins - 1; i >= 0; i--) {
        const x = (i / (numBins - 1)) * w;
        ctx.lineTo(x, mid - mins[i] * amp);
      }
      ctx.closePath();
    };

    // BEFORE: 常に表示（薄いグレー・収録で判別しやすい）
    ctx.fillStyle = 'rgba(161,161,170,0.35)';
    ctx.strokeStyle = 'rgba(212,212,216,0.5)';
    ctx.lineWidth = 1.5;
    drawShape(smoothMaxO, smoothMinO);
    ctx.fill();
    ctx.stroke();

    // AFTER: 常に表示（シアン・Before/After が一画面で分かる）
    ctx.fillStyle = 'rgba(34,211,238,0.4)';
    ctx.strokeStyle = 'rgba(103,232,249,0.85)';
    ctx.lineWidth = 2;
    drawShape(smoothMaxM, smoothMinM);
    ctx.fill();
    ctx.stroke();
  }, [originalBuffer, gainDb]);

  const playheadPct = durationSec > 0 && playbackPositionSec != null ? (playbackPositionSec / durationSec) * 100 : 0;

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-[#050508]" style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold uppercase tracking-widest text-zinc-400">Before</span>
          <span className="text-xs text-zinc-500 font-mono">Original</span>
        </div>
        <div className="flex flex-col gap-0.5 text-right">
          <span className="text-sm font-bold uppercase tracking-widest text-cyan-400">After</span>
          <span className="text-xs text-cyan-400/80 font-mono">AI Mastered</span>
        </div>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} className="w-full block" style={{ minHeight: 220, height: 280 }} />
        {playbackPositionSec != null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 pointer-events-none z-10"
            style={{
              left: `${playheadPct}%`,
              boxShadow: '0 0 20px rgba(34,211,238,0.9), 0 0 40px rgba(34,211,238,0.5)',
            }}
            aria-hidden
          />
        )}
      </div>
      <div className="absolute bottom-3 left-4 z-10 pointer-events-none">
        <span className={`text-xs font-mono uppercase tracking-wider ${isHoldingOriginal ? 'text-amber-400' : 'text-cyan-400'}`}>
          {isHoldingOriginal ? '▶ Original' : '▶ Mastered'}
        </span>
      </div>
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
  /** 指定した AI でパラメータを再計算（リトライ時） */
  onRecalcWithAI?: () => Promise<void>;
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
  const startTimeRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const grAnalyserRef = useRef<AnalyserNode | null>(null);
  const nodesRef = useRef<{ bypassGain: GainNode | null; masteredGain: GainNode | null }>({ bypassGain: null, masteredGain: null });
  const [playbackPositionSec, setPlaybackPositionSec] = useState<number | null>(null);

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
  }, [audioBuffer, params, isHoldingOriginal]);

  useEffect(() => {
    if (!isPlaying) {
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
      startTimeRef.current = ctx.currentTime;
      src.start(0);
      setIsPlaying(true);
    } catch (_) {
      setupAudioGraph();
      const retry = sourceRef.current;
      if (retry) { startTimeRef.current = ctx.currentTime; retry.start(0); setIsPlaying(true); }
    }
  }, [isPlaying, setupAudioGraph]);

  useEffect(() => {
    if (!isPlaying) { setPlaybackPositionSec(null); return; }
    const ctx = audioContextRef.current;
    const duration = audioBuffer.duration;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!ctx) return;
      const elapsed = ctx.currentTime - startTimeRef.current;
      const pos = duration > 0 ? elapsed % duration : 0;
      setPlaybackPositionSec(pos);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, audioBuffer.duration]);

  const estimatedSize = formatBytes(estimateMasteredWavBytes(audioBuffer));
  const duration = formatDuration(audioBuffer.duration);

  return (
    <div className="space-y-5">
      {/* ── プレビュー再生：何を聴いているか常に明確 ── */}
      <section className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4">
        <p className="text-[13px] font-bold text-cyan-400 mb-3 uppercase tracking-wider">
          {ja ? '聞き比べ' : 'A/B Listen'}
        </p>
        {/* 現在聴いている音源を大きく表示 */}
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-black/30 border border-white/10">
          <span className="text-[11px] text-zinc-500 uppercase tracking-wider shrink-0">
            {ja ? '現在再生' : 'Now playing'}
          </span>
          <span
            className={`text-lg font-bold font-mono tabular-nums ${isHoldingOriginal ? 'text-amber-400' : 'text-cyan-400'}`}
          >
            {isHoldingOriginal ? (ja ? 'オリジナル' : 'Original') : (ja ? 'マスタリング後' : 'Mastered')}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 transition-all touch-manipulation shrink-0"
            style={{
              background: isPlaying ? 'rgba(255,255,255,0.1)' : '#22d3ee',
              color: isPlaying ? '#22d3ee' : '#000',
              boxShadow: isPlaying
                ? 'inset 0 0 10px rgba(0,0,0,0.4), 0 0 15px rgba(34,211,238,0.15)'
                : '0 0 24px rgba(34,211,238,0.4), 0 4px 12px rgba(0,0,0,0.4)',
              border: isPlaying ? '1px solid rgba(34,211,238,0.3)' : 'none',
            }}
            aria-label={isPlaying ? (ja ? '一時停止' : 'Pause') : (ja ? '再生' : 'Play')}
          >
            <span className="w-7 h-7">{isPlaying ? <PauseIcon /> : <PlayIcon />}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsHoldingOriginal(false)}
            className={`px-4 py-2.5 rounded-xl font-mono text-sm font-medium transition-all touch-manipulation border ${!isHoldingOriginal ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-white/5 border-white/10 text-zinc-400 hover:border-cyan-500/40'}`}
          >
            {ja ? '聴く: マスタリング後' : 'Listen: Mastered'}
          </button>
          <button
            type="button"
            onClick={() => setIsHoldingOriginal(true)}
            className={`px-4 py-2.5 rounded-xl font-mono text-sm font-medium transition-all touch-manipulation border ${isHoldingOriginal ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-white/5 border-white/10 text-zinc-400 hover:border-amber-500/40'}`}
          >
            {ja ? '聴く: オリジナル' : 'Listen: Original'}
          </button>
        </div>
      </section>

      {/* ── 波形: オリジナル＋マスター重ね。縦線＝再生位置 ── */}
      <div className="space-y-1">
        <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
          {ja ? '波形（Original + Master 重ね）・再生位置' : 'Waveform (Original + Master overlay) · Playhead'}
        </p>
      <WaveformOverlay
        originalBuffer={audioBuffer}
        gainDb={params.gain_adjustment_db}
        isHoldingOriginal={isHoldingOriginal}
        playbackPositionSec={playbackPositionSec}
      />
      </div>

      {/* ── Meters Row ── */}
      <div className="flex items-stretch gap-3">
        <div className="flex-1 space-y-2">
          <LivePeakMeter analyserRef={analyserRef} isPlaying={isPlaying} />
          <p className="text-[12px] text-zinc-400 font-mono">
            {ja ? 'リアルタイム ピーク' : 'Real-time Peak'}
          </p>
        </div>
        <GainReductionMeter
          preLimiterAnalyserRef={grAnalyserRef}
          isPlaying={isPlaying}
          limiterCeiling={params.limiter_ceiling_db}
        />
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
  onRecalcWithAI,
  language: languageProp,
}) => {
  const { t, language: contextLang } = useTranslation();
  const language = languageProp ?? contextLang;
  const ja = language === 'ja';
  const [isRetryOpen, setIsRetryOpen] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleRetry = useCallback(
    async (feedback: FeedbackType) => {
      if (!params || !onFeedbackApply) return;
      setIsRetryOpen(false);
      await new Promise((r) => setTimeout(r, 300));
      const adjusted = applyFeedbackAdjustment(params, feedback);
      const clamped = clampMasteringParams(adjusted);
      // フィードバック後は「固定値でゲインを足す/引く」ではなく、自己補正ループで計測→最適化する
      if (audioBuffer) {
        try {
          const optimized = await optimizeMasteringParams(audioBuffer, clamped);
          onFeedbackApply(optimized.params);
          return;
        } catch (e) {
          console.warn('Feedback optimize failed; fallback to clamped params', e);
        }
      }
      onFeedbackApply(clamped);
    },
    [params, onFeedbackApply, audioBuffer],
  );

  const handleRecalcWithAI = useCallback(
    async () => {
      if (!onRecalcWithAI) return;
      setIsRetryOpen(false);
      setIsRecalculating(true);
      try {
        await onRecalcWithAI();
      } finally {
        setIsRecalculating(false);
      }
    },
    [onRecalcWithAI],
  );

  if (isLoading || !params) return null;

  return (
    <div className="space-y-6">
      {audioBuffer && <AudioPreview audioBuffer={audioBuffer} params={params} />}

      {/* リトライする：問題例 ＋ 無料再実行 or 購入 */}
      {(onRecalcWithAI || onDownloadMastered) && (
        <section className="rounded-xl bg-white/[0.04] border border-white/10 p-4 sm:p-5 space-y-4">
          <h4 className="text-base font-bold text-white">
            {t('result.retry.title')}
          </h4>
          <p className="text-[13px] text-zinc-400 leading-relaxed">
            {t('result.retry.problems')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            {onRecalcWithAI && (
              <button
                type="button"
                onClick={handleRecalcWithAI}
                disabled={isRecalculating}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-white/10 text-white border border-white/20 hover:bg-white/20 disabled:opacity-60 transition-colors"
              >
                {isRecalculating ? (
                  <>
                    <div className="w-4 h-4 shrink-0 text-cyan-400"><Spinner /></div>
                    <span>{ja ? '再計算中...' : 'Recalculating...'}</span>
                  </>
                ) : (
                  <span>{t('result.retry.free')}</span>
                )}
              </button>
            )}
            {onDownloadMastered && (
              <button
                type="button"
                onClick={onDownloadMastered}
                disabled={isProcessingAudio}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-black bg-cyan-500 hover:bg-cyan-400 border border-cyan-400/50 disabled:opacity-60 transition-colors"
              >
                <CardIcon className="w-5 h-5 shrink-0" />
                <span>{t('result.purchase_cta')}</span>
              </button>
            )}
          </div>
        </section>
      )}

      <RetryModal
        isOpen={isRetryOpen}
        onClose={() => setIsRetryOpen(false)}
        onRetry={handleRetry}
        onRecalcWithAI={onRecalcWithAI ? handleRecalcWithAI : undefined}
        isRecalculating={isRecalculating}
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
