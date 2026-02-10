
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { MasteringParams } from '../types';
import { buildMasteringChain } from '../services/audioService';
import { applyFeedbackAdjustment, type FeedbackType } from '../services/feedbackService';
import { clampMasteringParams } from '../services/geminiService';
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

/* ── Waveform Overlay: オリジナル＋マスター重ね表示。再生位置プレイヘッドでプロが判断しやすい ─── */
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

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const mid = h / 2;
    const data = originalBuffer.getChannelData(0);
    const numBins = Math.min(w * 3, 4096);
    const step = data.length / numBins;
    const gainLinear = Math.pow(10, gainDb / 20);

    const minsOrig: number[] = [];
    const maxsOrig: number[] = [];
    const minsMaster: number[] = [];
    const maxsMaster: number[] = [];
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

    const amp = mid * 0.9;
    const scale = (numBins - 1) / w;

    ctx.fillStyle = '#08080c';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(w, mid);
    ctx.stroke();

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const drawShape = (maxs: number[], mins: number[]) => {
      ctx.beginPath();
      ctx.moveTo(0, mid);
      for (let x = 0; x <= w; x++) {
        const idx = Math.min(Math.floor(x * scale), numBins - 1);
        ctx.lineTo(x, mid - maxs[idx] * amp);
      }
      for (let x = w; x >= 0; x--) {
        const idx = Math.min(Math.floor(x * scale), numBins - 1);
        ctx.lineTo(x, mid - mins[idx] * amp);
      }
      ctx.closePath();
    };

    ctx.fillStyle = '#3f3f46';
    ctx.strokeStyle = '#52525b';
    ctx.lineWidth = 1;
    drawShape(maxsOrig, minsOrig);
    ctx.fill();
    ctx.stroke();

    if (!isHoldingOriginal) {
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#22d3ee';
      ctx.strokeStyle = 'rgba(34,211,238,0.9)';
      ctx.lineWidth = 1;
      drawShape(maxsMaster, minsMaster);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }, [originalBuffer, gainDb, isHoldingOriginal]);

  const playheadPct = durationSec > 0 && playbackPositionSec != null ? (playbackPositionSec / durationSec) * 100 : 0;

  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8), 0 4px 24px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider font-mono transition-all ${isHoldingOriginal ? 'bg-white/90 text-black' : 'bg-white/5 text-zinc-400 border border-white/10'}`}>
          Original
        </span>
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider font-mono transition-all ${!isHoldingOriginal ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(6,182,212,0.5)]' : 'bg-white/5 text-zinc-400 border border-white/10'}`}>
          AI Mastered
        </span>
      </div>
      <div className="relative">
        <canvas ref={canvasRef} className="w-full h-44 sm:h-52 block" />
        {playbackPositionSec != null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 pointer-events-none z-10 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
            style={{ left: `${playheadPct}%` }}
            aria-hidden
          />
        )}
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
  onRecalcWithAI?: (provider: 'gemini' | 'openai') => Promise<void>;
  /** OpenAI API キーが設定されていれば true（OpenAI 選択を表示） */
  hasOpenAI?: boolean;
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
  const [graphReady, setGraphReady] = useState(false);
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

      {/* ── 周波数スペクトラム（対数・dB表示） ── */}
      <MasteringConsole analyserRef={analyserRef} isPlaying={isPlaying} graphReady={graphReady} />

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
  hasOpenAI = false,
  language: languageProp,
}) => {
  const { language: contextLang } = useTranslation();
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
      onFeedbackApply(clamped);
    },
    [params, onFeedbackApply],
  );

  const handleRecalcWithAI = useCallback(
    async (provider: 'gemini' | 'openai') => {
      if (!onRecalcWithAI) return;
      setIsRetryOpen(false);
      setIsRecalculating(true);
      try {
        await onRecalcWithAI(provider);
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
        onRecalcWithAI={onRecalcWithAI ? handleRecalcWithAI : undefined}
        hasOpenAI={hasOpenAI}
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
