
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { MasteringParams } from '../types';
import { Spinner, DownloadIcon, PlayIcon, PauseIcon, AiProposeIcon } from './Icons';
import { useTranslation } from '../contexts/LanguageContext';

/** オーディオビジュアライザー（音声は変更せず AnalyserNode で読み取りのみ） */
const PreviewVisualizer: React.FC<{ analyserRef: React.RefObject<AnalyserNode | null>; isPlaying: boolean }> = ({ analyserRef, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!isPlaying || !analyserRef.current || !canvasRef.current) return;
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    dataArrayRef.current = dataArray;

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      if (!analyserRef.current || !canvasRef.current || !ctx) return;
      analyser.getByteFrequencyData(dataArray);

      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = 'rgba(5, 5, 8, 0.3)';
      ctx.fillRect(0, 0, w, h);

      const barCount = 32;
      const barWidth = w / barCount;
      for (let i = 0; i < barCount; i++) {
        const idx = Math.floor((i / barCount) * bufferLength);
        const v = dataArray[idx] / 255;
        const barH = Math.max(4, v * h * 0.9);
        const x = i * barWidth + 2;
        const y = h - barH;
        const g = ctx.createLinearGradient(0, h, 0, 0);
        g.addColorStop(0, '#22d3ee');
        g.addColorStop(0.7, '#67e8f9');
        g.addColorStop(1, '#a78bfa');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, barWidth - 2, barH);
      }
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, analyserRef]);

  return (
    <div className="w-full h-20 sm:h-24 rounded-xl bg-black/40 border border-white/5 overflow-hidden relative">
      <canvas
        ref={canvasRef}
        width={320}
        height={96}
        className="w-full h-full block"
      />
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/30">
          <span className="text-[10px] text-zinc-500 font-medium">▶ 再生でビジュアライザー表示</span>
        </div>
      )}
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

const AudioPreview: React.FC<{
  audioBuffer: AudioBuffer;
  params: MasteringParams;
}> = ({ audioBuffer, params }) => {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBypassed, setIsBypassed] = useState(true);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nodesRef = useRef<{ bypassGain: GainNode | null; masteredGain: GainNode | null }>({ bypassGain: null, masteredGain: null });

  const setupAudioGraph = useCallback(() => {
    if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close().catch(() => {});
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = context;
    const analyser = context.createAnalyser();
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
    limiter.threshold.value = params.limiter_ceiling_db;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
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

  const togglePlay = async () => {
    if (isPlaying) {
      try { sourceRef.current?.stop(); } catch (_) {}
      setIsPlaying(false);
      return;
    }
    if (!sourceRef.current || !audioContextRef.current) setupAudioGraph();
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
  };

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <div className="w-full relative">
        <PreviewVisualizer analyserRef={analyserRef} isPlaying={isPlaying} />
      </div>
      <div className="flex items-center justify-center gap-3 sm:gap-6 flex-wrap">
        <button
          onClick={() => setIsBypassed(true)}
          className={`flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 min-h-[60px] rounded-xl transition-all touch-manipulation ${isBypassed ? 'bg-cyan-500/15 border border-cyan-500/30' : 'opacity-40 hover:opacity-60 active:opacity-70'}`}
        >
          <span className="w-6 h-6"><PlayIcon /></span>
          <span className="text-[10px] sm:text-xs font-medium text-zinc-400">{t('agent.preview.original')}</span>
        </button>
        <button onClick={togglePlay} className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-cyan-500 flex items-center justify-center text-black hover:bg-cyan-400 active:scale-95 transition-all touch-manipulation shrink-0">
          <span className="w-7 h-7 sm:w-8 sm:h-8">{isPlaying ? <PauseIcon /> : <PlayIcon />}</span>
        </button>
        <button
          onClick={() => setIsBypassed(false)}
          className={`flex flex-col items-center gap-1.5 sm:gap-2 p-3 sm:p-4 min-h-[60px] rounded-xl transition-all touch-manipulation ${!isBypassed ? 'bg-cyan-500/15 border border-cyan-500/30' : 'opacity-40 hover:opacity-60 active:opacity-70'}`}
        >
          <span className="w-6 h-6"><AiProposeIcon /></span>
          <span className="text-xs font-medium text-zinc-400">{t('agent.preview.mastered')}</span>
        </button>
      </div>
      <p className="text-xs text-zinc-500">+{params.gain_adjustment_db.toFixed(1)} dB · {params.limiter_ceiling_db.toFixed(1)} dBTP</p>
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

  if (isLoading || !params) return null;

  return (
    <div className="space-y-6">
      {audioBuffer && <AudioPreview audioBuffer={audioBuffer} params={params} />}

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
