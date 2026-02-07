
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { MasteringParams } from '../types';
import { Spinner, DownloadIcon, PlayIcon, PauseIcon, AiProposeIcon } from './Icons';
import { useTranslation } from '../contexts/LanguageContext';

/** 再生中のリアルタイム Peak（dB）表示。判断材料として数値を出す。 */
const LivePeakMeter: React.FC<{
  analyserRef: React.RefObject<AnalyserNode | null>;
  isPlaying: boolean;
  label: string;
}> = ({ analyserRef, isPlaying, label }) => {
  const [peakDb, setPeakDb] = useState<number | null>(null);
  const dataRef = useRef<Float32Array | null>(null);

  useEffect(() => {
    if (!isPlaying || !analyserRef.current) {
      setPeakDb(null);
      return;
    }
    const analyser = analyserRef.current;
    const length = analyser.fftSize;
    const data = new Float32Array(length);
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
      const db = max <= 1e-6 ? -100 : 20 * Math.log10(max);
      setPeakDb(db);
    };
    update();
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, analyserRef]);

  return (
    <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-black/40 border border-white/10">
      <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
      <span className="font-mono text-sm font-bold tabular-nums text-cyan-400">
        {peakDb != null ? `${peakDb.toFixed(1)} dB` : '—'}
      </span>
    </div>
  );
};

/** 再生レベル（周波数）のリアルタイム表示。AnalyserNode で読み取りのみ。 */
const PreviewVisualizer: React.FC<{
  analyserRef: React.RefObject<AnalyserNode | null>;
  isPlaying: boolean;
  label: string;
  idleLabel: string;
}> = ({ analyserRef, isPlaying, label, idleLabel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!isPlaying || !analyserRef.current || !canvasRef.current) return;
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    analyser.smoothingTimeConstant = 0.7;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    dataArrayRef.current = dataArray;

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      if (!analyserRef.current || !canvasRef.current || !ctx) return;
      analyser.getByteFrequencyData(dataArray);

      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = 'rgba(5, 5, 8, 0.5)';
      ctx.fillRect(0, 0, w, h);

      const barCount = 32;
      const barWidth = w / barCount;
      for (let i = 0; i < barCount; i++) {
        const idx = Math.floor((i / barCount) * bufferLength);
        const v = dataArray[idx] / 255;
        const barH = Math.max(2, v * h * 0.88);
        const x = i * barWidth + 1;
        const y = h - barH;
        ctx.fillStyle = i < barCount / 2 ? '#22d3ee' : '#67e8f9';
        ctx.fillRect(x, y, barWidth - 2, barH);
      }
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, analyserRef]);

  return (
    <div className="w-full rounded-xl bg-black/50 border border-white/10 overflow-hidden">
      <p className="text-[10px] font-medium text-zinc-500 px-3 pt-2 uppercase tracking-wider">{label}</p>
      <div className="relative h-20 sm:h-24">
        <canvas ref={canvasRef} width={320} height={96} className="w-full h-full block" />
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20">
            <span className="text-[10px] text-zinc-500">{idleLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
};

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

/** マスター書き出しWAVの推定サイズ（16bit・ヘッダ44byte） */
function estimateMasteredWavBytes(buffer: AudioBuffer): number {
  const samples = buffer.length * buffer.numberOfChannels;
  return samples * 2 + 44;
}

const AudioPreview: React.FC<{
  audioBuffer: AudioBuffer;
  params: MasteringParams;
}> = ({ audioBuffer, params }) => {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBypassed, setIsBypassed] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nodesRef = useRef<{ bypassGain: GainNode | null; masteredGain: GainNode | null }>({ bypassGain: null, masteredGain: null });

  const setupAudioGraph = useCallback(() => {
    if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close().catch(() => {});
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = context;
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    analyserRef.current = analyser;
    const bypassGain = context.createGain();
    const masteredGain = context.createGain();
    bypassGain.connect(analyser);
    masteredGain.connect(analyser);
    analyser.connect(context.destination);
    bypassGain.gain.value = isBypassed ? 1.0 : 0.0;
    masteredGain.gain.value = isBypassed ? 0.0 : 1.0;
    const source = context.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = true;
    source.connect(bypassGain);
    let lastNode: AudioNode = source;
    const preGain = context.createGain();
    preGain.gain.value = Math.pow(10, params.gain_adjustment_db / 20);
    lastNode.connect(preGain);
    lastNode = preGain;
    if (params.eq_adjustments?.length) {
      for (const eq of params.eq_adjustments) {
        const f = context.createBiquadFilter();
        f.type = (eq.type === 'peak' ? 'peaking' : eq.type) as BiquadFilterType;
        f.frequency.value = eq.frequency;
        f.gain.value = eq.gain_db;
        f.Q.value = eq.q;
        lastNode.connect(f);
        lastNode = f;
      }
    }
    const limiter = context.createDynamicsCompressor();
    const ceilingDb = params.limiter_ceiling_db ?? -0.1;
    limiter.threshold.value = ceilingDb - 6;
    limiter.knee.value = 6;
    limiter.ratio.value = 8;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.08;
    lastNode.connect(limiter);
    limiter.connect(masteredGain);
    sourceRef.current = source;
    nodesRef.current = { bypassGain, masteredGain };
  }, [audioBuffer, params, isBypassed]);

  useEffect(() => {
    if (!isPlaying) setupAudioGraph();
  }, [audioBuffer, params, isPlaying, setupAudioGraph]);

  useEffect(() => {
    return () => {
      try { sourceRef.current?.stop(); } catch (_) {}
      audioContextRef.current?.close?.();
    };
  }, []);

  useEffect(() => {
    if (nodesRef.current.bypassGain && nodesRef.current.masteredGain && audioContextRef.current) {
      const now = audioContextRef.current.currentTime;
      nodesRef.current.bypassGain.gain.setTargetAtTime(isBypassed ? 1.0 : 0.0, now, 0.08);
      nodesRef.current.masteredGain.gain.setTargetAtTime(isBypassed ? 0.0 : 1.0, now, 0.08);
    }
  }, [isBypassed]);

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
      if (retry) {
        retry.start(0);
        setIsPlaying(true);
      }
    }
  }, [isPlaying, setupAudioGraph]);

  return (
    <div className="flex flex-col gap-5">
      <div className="w-full space-y-2">
        <LivePeakMeter
          analyserRef={analyserRef}
          isPlaying={isPlaying}
          label={t('agent.preview.peak_live')}
        />
        <PreviewVisualizer
          analyserRef={analyserRef}
          isPlaying={isPlaying}
          label={t('agent.preview.visualizer')}
          idleLabel={t('agent.preview.visualizer_idle')}
        />
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
          {t('agent.preview.params_short')} · +{params.gain_adjustment_db.toFixed(1)} dB / {params.limiter_ceiling_db.toFixed(1)} dBTP
        </p>
        <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
          <button
            onClick={() => { setIsBypassed(false); }}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all touch-manipulation ${!isBypassed ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'border-white/10 text-zinc-400 hover:border-white/20'}`}
          >
            <span className="w-5 h-5"><AiProposeIcon /></span>
            <span className="text-sm font-medium">{t('agent.preview.mastered')}</span>
          </button>
          <button
            onClick={togglePlay}
            className="w-14 h-14 rounded-full bg-cyan-500 flex items-center justify-center text-black hover:bg-cyan-400 active:scale-95 transition-all touch-manipulation shrink-0"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            <span className="w-7 h-7">{isPlaying ? <PauseIcon /> : <PlayIcon />}</span>
          </button>
          <button
            onClick={() => { setIsBypassed(true); }}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all touch-manipulation ${isBypassed ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'border-white/10 text-zinc-400 hover:border-white/20'}`}
          >
            <span className="w-5 h-5"><PlayIcon /></span>
            <span className="text-sm font-medium">{t('agent.preview.original')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const MasteringAgent: React.FC<MasteringAgentProps> = ({
  params,
  isLoading,
  onDownloadMastered,
  isProcessingAudio,
  audioBuffer,
}) => {
  const { t } = useTranslation();
  const estimatedSize = audioBuffer ? formatBytes(estimateMasteredWavBytes(audioBuffer)) : null;

  if (isLoading || !params) return null;

  return (
    <div className="space-y-6">
      {audioBuffer && <AudioPreview audioBuffer={audioBuffer} params={params} />}

      {estimatedSize && (
        <p className="text-xs text-zinc-500">
          {t('agent.file_size', { replacements: { size: estimatedSize } })}
        </p>
      )}

      <button
        onClick={onDownloadMastered}
        disabled={isProcessingAudio}
        className="w-full flex items-center justify-center gap-3 py-4 px-6 min-h-[52px] rounded-2xl bg-cyan-500 text-black font-bold text-base hover:bg-cyan-400 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all touch-manipulation"
      >
        {isProcessingAudio ? (
          <>
            <Spinner />
            <span>{t('agent.button.processing')}</span>
          </>
        ) : (
          <>
            <DownloadIcon />
            <span>{t('agent.button.download')}</span>
          </>
        )}
      </button>
    </div>
  );
};

export default MasteringAgent;
