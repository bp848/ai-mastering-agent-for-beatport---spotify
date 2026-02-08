
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { MasteringParams } from '../types';
import { buildMasteringChain } from '../services/audioService';
import { Spinner, DownloadIcon, PlayIcon, PauseIcon } from './Icons';
import { useTranslation } from '../contexts/LanguageContext';

/* ─────────────────────────────────────────────────────────────────
   "Glass Cockpit" — Professional Preview & Comparison Player
   
   Key Features:
   1. Waveform Overlay (gray = original, cyan = mastered)
   2. Hold-to-Compare (press and hold for original)
   3. Gain Reduction Meter
   4. Download with WAV specs
   ───────────────────────────────────────────────────────────────── */

/* ── Waveform Overlay Canvas ─────────────────────────────── */
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

    ctx.clearRect(0, 0, w, h);

    // Center line
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(w, mid);
    ctx.stroke();

    // Helper: draw waveform
    const drawWave = (color: string, multiplier: number, alpha: number) => {
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      for (let x = 0; x < w; x++) {
        const start = x * step;
        let min = 1, max = -1;
        for (let j = 0; j < step && start + j < data.length; j++) {
          const v = data[start + j] * multiplier;
          if (v < min) min = v;
          if (v > max) max = v;
        }
        // Clamp
        min = Math.max(min, -1);
        max = Math.min(max, 1);
        const y1 = mid - max * mid * 0.85;
        const y2 = mid - min * mid * 0.85;
        ctx.fillRect(x, y1, 1, Math.max(1, y2 - y1));
      }
      ctx.globalAlpha = 1;
    };

    // Draw original (gray, dimmer)
    drawWave('rgba(120,120,120,0.7)', 1.0, isHoldingOriginal ? 1.0 : 0.35);

    // Draw mastered (cyan, brighter) — only when NOT holding
    if (!isHoldingOriginal) {
      drawWave('rgba(34,211,238,0.85)', gainLinear, 0.85);
    }
  }, [originalBuffer, gainDb, isHoldingOriginal]);

  return (
    <div className="relative w-full rounded-xl bg-black/60 border border-white/10 overflow-hidden group">
      {/* Labels */}
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all ${
          isHoldingOriginal ? 'bg-white text-black' : 'bg-white/10 text-zinc-500'
        }`}>
          Original
        </span>
        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all ${
          !isHoldingOriginal ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-white/10 text-zinc-500'
        }`}>
          AI Mastered
        </span>
      </div>
      <canvas ref={canvasRef} className="w-full h-40 sm:h-48 block" />
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
      <span className="text-[8px] text-zinc-600 uppercase tracking-widest">GR</span>
      <div className="relative w-3 h-24 rounded-full bg-zinc-900 border border-white/10 overflow-hidden">
        <div
          className="absolute top-0 left-0 w-full bg-gradient-to-b from-red-500 to-amber-500 rounded-b-full"
          style={{ height: `${barHeight}%`, transition: 'height 50ms linear' }}
        />
      </div>
      <span className="text-[9px] font-mono text-red-400 tabular-nums">
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
      <span className="text-[9px] text-zinc-600 font-mono w-12 text-right tabular-nums shrink-0">
        {peakDb > -100 ? `${peakDb.toFixed(1)}` : '—'} dB
      </span>
      <div className="flex-1 h-2 rounded-full bg-zinc-900 border border-white/5 overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-75 rounded-full`}
          style={{ width: `${barPercent}%` }}
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
    if (!isPlaying) setupAudioGraph();
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
          <p className="text-[9px] text-zinc-600 font-mono">
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

      {/* ── Controls ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Play */}
        <button
          onClick={togglePlay}
          className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform touch-manipulation shrink-0 shadow-lg"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          <span className="w-7 h-7">{isPlaying ? <PauseIcon /> : <PlayIcon />}</span>
        </button>

        {/* Hold-to-Compare (PC: mousedown/up, Mobile: touchstart/end/cancel) */}
        <button
          onMouseDown={() => setIsHoldingOriginal(true)}
          onMouseUp={() => setIsHoldingOriginal(false)}
          onMouseLeave={() => setIsHoldingOriginal(false)}
          onTouchStart={(e) => { e.preventDefault(); setIsHoldingOriginal(true); }}
          onTouchEnd={(e) => { e.preventDefault(); setIsHoldingOriginal(false); }}
          onTouchCancel={() => setIsHoldingOriginal(false)}
          onContextMenu={(e) => e.preventDefault()}
          className={`flex-1 w-full sm:w-auto px-6 py-4 rounded-xl border font-mono text-[11px] uppercase tracking-widest select-none transition-all touch-manipulation ${
            isHoldingOriginal
              ? 'bg-white/10 border-white/40 text-white'
              : 'border-white/15 text-zinc-400 hover:bg-white/5'
          }`}
        >
          {ja ? '長押しでオリジナルと比較' : 'Hold to Compare Original'}
        </button>
      </div>

      {/* ── Process Info + Specs ── */}
      <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 space-y-2">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
          {ja ? '適用済み処理' : 'Applied Processing'}
        </p>
        <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
          Tube Sat ({params.tube_drive_amount.toFixed(1)}) → Pultec EQ → {params.eq_adjustments.length}-band EQ → Exciter ({params.exciter_amount.toFixed(2)}) → M/S ({params.width_amount.toFixed(2)}x) → Soft Clip → Limiter ({params.limiter_ceiling_db.toFixed(1)} dBTP)
        </p>
        <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-500 pt-1 border-t border-white/5">
          <span>WAV 16bit / 44.1kHz</span>
          <span>{duration}</span>
          <span>{estimatedSize}</span>
        </div>
        <p className="text-[9px] text-zinc-600">
          {ja
            ? '※ WAV形式のためファイルサイズは変化しませんが、波形データは書き換えられています。'
            : '※ WAV format: file size does not change, but waveform data has been rewritten.'}
        </p>
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
}) => {
  const { language } = useTranslation();
  const ja = language === 'ja';

  if (isLoading || !params) return null;

  return (
    <div className="space-y-6">
      {audioBuffer && <AudioPreview audioBuffer={audioBuffer} params={params} />}

      <button
        onClick={onDownloadMastered}
        disabled={isProcessingAudio}
        className="w-full flex items-center justify-center gap-3 py-4 px-6 min-h-[52px] rounded-2xl bg-cyan-500 text-black font-bold text-base hover:bg-cyan-400 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all touch-manipulation shadow-lg shadow-cyan-500/20"
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
    </div>
  );
};

export default MasteringAgent;
