/**
 * MasteringWorkspace — アップロード直後に表示するフルスクリーン作業画面
 * MASTERSCOPE風UI: ビジュアライザー、波形、分析結果、マスタリング実行
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, Download, Share2, RefreshCw, Activity, Settings2,
  AlertCircle, BrainCircuit, Volume2, ArrowLeft,
} from 'lucide-react';
import type { AudioAnalysisData, MasteringParams, MasteringTarget } from '../types';
import DiagnosisReport from './DiagnosisReport';
import ExportModal from './ExportModal';
import { useTranslation } from '../contexts/LanguageContext';

const PRESETS: { id: MasteringTarget; name: string; lufs: number; tp: number }[] = [
  { id: 'spotify', name: 'SPOTIFY / YT', lufs: -14, tp: -1.0 },
  { id: 'beatport', name: 'BEATPORT / CLUB', lufs: -8, tp: -0.1 },
];

interface MasteringWorkspaceProps {
  language: 'ja' | 'en';
  audioFile: File;
  audioBuffer: AudioBuffer | null;
  analysisData: AudioAnalysisData | null;
  masteringParams: MasteringParams | null;
  masterMetrics: { lufs: number; peakDb: number } | null;
  masterBuffer: AudioBuffer | null;
  masteringTarget: MasteringTarget;
  isAnalyzing: boolean;
  isMastering: boolean;
  onTargetChange: (t: MasteringTarget) => void;
  onExecuteMastering: () => void;
  onResetUpload: () => void;
  onOpenResults: () => void;
  onDownloadMastered: () => void;
  isExporting: boolean;
}

type AudioSource = 'before' | 'after';

export default function MasteringWorkspace({
  language,
  audioFile,
  audioBuffer,
  analysisData,
  masteringParams,
  masterMetrics,
  masterBuffer,
  masteringTarget,
  isAnalyzing,
  isMastering,
  onTargetChange,
  onExecuteMastering,
  onResetUpload,
  onOpenResults,
  onDownloadMastered,
  isExporting,
}: MasteringWorkspaceProps) {
  const { t } = useTranslation();
  const ja = language === 'ja';
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSource, setActiveSource] = useState<AudioSource>('before');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);

  const audioCtx = useRef<AudioContext | null>(null);
  const nodes = useRef<{
    sources: { before: AudioBufferSourceNode | null; after: AudioBufferSourceNode | null };
    analysers: { before: AnalyserNode | null; after: AnalyserNode | null };
    gains: { before: GainNode | null; after: GainNode | null };
    master: GainNode | null;
  }>({
    sources: { before: null, after: null },
    analysers: { before: null, after: null },
    gains: { before: null, after: null },
    master: null,
  });
  const currentTime = useRef(0);
  const startTime = useRef(0);
  const offsetTime = useRef(0);
  const lastDisplaySec = useRef(0);
  const visualizerCanvas = useRef<HTMLCanvasElement>(null);
  const waveformCanvas = useRef<HTMLCanvasElement>(null);

  const duration = audioBuffer?.duration ?? 0;
  const selectedPreset = PRESETS.find((p) => p.id === masteringTarget) ?? PRESETS[0];

  const initEngine = useCallback(() => {
    if (audioCtx.current) return;
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    audioCtx.current = ctx;
    nodes.current.master = ctx.createGain();
    nodes.current.master.connect(ctx.destination);
    nodes.current.analysers.before = ctx.createAnalyser();
    nodes.current.analysers.after = ctx.createAnalyser();
    nodes.current.gains.before = ctx.createGain();
    nodes.current.gains.after = ctx.createGain();
    nodes.current.gains.before.connect(nodes.current.analysers.before!);
    nodes.current.gains.after.connect(nodes.current.analysers.after!);
    nodes.current.analysers.before!.connect(nodes.current.master!);
    nodes.current.analysers.after!.connect(nodes.current.master!);
  }, []);

  const togglePlay = useCallback(async () => {
    if (!audioCtx.current || !audioBuffer) return;
    if (isPlaying) {
      nodes.current.sources.before?.stop();
      nodes.current.sources.after?.stop();
      setIsPlaying(false);
    } else {
      if (audioCtx.current.state === 'suspended') await audioCtx.current.resume();
      const startSource = (type: 'before' | 'after') => {
        const buf = type === 'before' ? audioBuffer : masterBuffer;
        if (!buf || !audioCtx.current) return null;
        const s = audioCtx.current.createBufferSource();
        s.buffer = buf;
        s.loop = true;
        s.connect(nodes.current.gains[type]!);
        s.start(0, currentTime.current);
        return s;
      };
      nodes.current.sources.before = startSource('before');
      nodes.current.sources.after = masterBuffer ? startSource('after') : null;
      startTime.current = audioCtx.current.currentTime;
      offsetTime.current = currentTime.current;
      setIsPlaying(true);
    }
  }, [audioBuffer, masterBuffer, isPlaying]);

  useEffect(() => {
    if (!nodes.current.gains.before || !nodes.current.gains.after || !audioCtx.current) return;
    const now = audioCtx.current.currentTime;
    nodes.current.gains.before.gain.setTargetAtTime(activeSource === 'before' ? 1 : 0, now, 0.02);
    nodes.current.gains.after.gain.setTargetAtTime(activeSource === 'after' ? 1 : 0, now, 0.02);
  }, [activeSource]);

  useEffect(() => {
    if (audioBuffer) initEngine();
  }, [audioBuffer, initEngine]);

  useEffect(() => {
    if (!isPlaying) setDisplayTime(currentTime.current);
  }, [isPlaying]);

  // Animation loop
  useEffect(() => {
    let frame: number;
    const draw = () => {
      if (isPlaying && audioCtx.current) {
        currentTime.current = (audioCtx.current.currentTime - startTime.current + offsetTime.current) % (duration || 1);
        const sec = Math.floor(currentTime.current);
        if (sec !== lastDisplaySec.current) {
          lastDisplaySec.current = sec;
          setDisplayTime(currentTime.current);
        }
      }
      if (visualizerCanvas.current) {
        const ctx = visualizerCanvas.current.getContext('2d', { alpha: false });
        if (ctx) {
          const w = visualizerCanvas.current.width;
          const h = visualizerCanvas.current.height;
          ctx.fillStyle = '#050505';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#151515';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let x = 0; x <= w; x += w / 20) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
          }
          for (let y = 0; y <= h; y += h / 10) {
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
          }
          ctx.stroke();
          const analyser = activeSource === 'before' ? nodes.current.analysers.before : nodes.current.analysers.after;
          if (analyser) {
            const data = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(data);
            ctx.strokeStyle = activeSource === 'before' ? '#3b82f6' : '#ef4444';
            ctx.lineWidth = 3;
            ctx.beginPath();
            const slice = w / (data.length / 3);
            for (let i = 0; i < data.length / 3; i++) {
              const y = h - (data[i] / 255) * h * 0.8 - 40;
              if (i === 0) ctx.moveTo(0, y);
              else ctx.lineTo(i * slice, y);
            }
            ctx.stroke();
          }
        }
      }
      if (waveformCanvas.current && duration > 0) {
        const ctx = waveformCanvas.current.getContext('2d');
        if (ctx) {
          const w = waveformCanvas.current.width;
          const h = waveformCanvas.current.height;
          ctx.clearRect(0, 0, w, h);
          const x = (currentTime.current / duration) * w;
          ctx.fillStyle = '#fff';
          ctx.fillRect(x, 0, 2, h);
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#fff';
          ctx.fillRect(x - 1, 0, 4, h);
        }
      }
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, activeSource, duration]);

  const Metric = ({ label, val, unit, color = 'text-white' }: { label: string; val: string | number; unit: string; color?: string }) => (
    <div className="bg-[#151515] border border-[#222] p-4 flex flex-col gap-1">
      <span className="text-[9px] font-black text-zinc-600 uppercase tracking-tighter">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-black tabular-nums ${color}`}>{val}</span>
        <span className="text-[10px] text-zinc-700 font-bold">{unit}</span>
      </div>
    </div>
  );

  const isProcessing = isAnalyzing || isMastering;
  const hasMastered = !!masteringParams && !!masterBuffer;

  return (
    <div className="h-screen bg-[#000] text-[#eee] flex flex-col font-mono overflow-hidden select-none border border-[#222]">
      <header className="h-14 bg-[#0a0a0a] border-b border-[#333] flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={onResetUpload}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-[11px] font-black uppercase">{ja ? '別のファイル' : 'Other file'}</span>
          </button>
          <div className="flex items-center gap-3 px-4 py-1.5 bg-black border border-[#444] shadow-inner">
            <div className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500 animate-pulse'}`} />
            <h1 className="text-[12px] font-black tracking-[0.3em] text-white">MASTERSCOPE <span className="text-zinc-700">PR-7000</span></h1>
          </div>
          <div className="flex bg-black border border-[#222] p-1 gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onTargetChange(p.id)}
                className={`px-3 py-1 text-[9px] font-black transition-all border ${masteringTarget === p.id ? 'bg-[#333] border-[#555] text-white' : 'border-transparent text-zinc-600'}`}
              >
                {p.id.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onDownloadMastered}
            disabled={!masteringParams || isExporting}
            className="flex items-center gap-2 h-9 px-6 bg-blue-700 hover:bg-blue-600 disabled:bg-[#111] disabled:text-[#333] text-white text-[11px] font-black border border-blue-500 transition-all active:scale-95"
          >
            <Download size={14} /> {ja ? 'WAV出力' : 'Export WAV'}
          </button>
          <button
            type="button"
            onClick={() => masteringParams && setIsExportOpen(true)}
            disabled={!masteringParams}
            className="flex items-center gap-2 h-9 px-6 bg-[#222] hover:bg-[#333] disabled:opacity-50 text-zinc-100 text-[11px] font-black border border-[#444] transition-all"
          >
            <Share2 size={14} /> {ja ? 'ビデオ生成' : 'Video'}
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col bg-[#050505]">
          <div className="flex-1 relative border-r border-[#222]">
            <canvas ref={visualizerCanvas} width={1920} height={1080} className="w-full h-full block opacity-80" />
            <div className="absolute top-6 left-6 flex flex-col gap-2 pointer-events-none">
              <div className={`px-4 py-1 text-[10px] font-black border ${activeSource === 'before' ? 'bg-blue-600 text-white border-blue-400' : 'bg-black text-zinc-800 border-[#222]'}`}>
                INPUT: PRE-MASTERING
              </div>
              <div className={`px-4 py-1 text-[10px] font-black border ${activeSource === 'after' ? 'bg-red-600 text-white border-red-400' : 'bg-black text-zinc-800 border-[#222]'}`}>
                OUTPUT: POST-MASTERING
              </div>
            </div>
          </div>
          <div className="h-40 bg-[#0a0a0a] border-t border-[#333] flex items-center p-6 gap-8 shrink-0">
            <div className="w-1/4 h-full bg-black border border-[#222] relative">
              <div className="absolute top-2 left-2 text-[8px] font-black text-zinc-700 z-10">PRECISION WAVEFORM</div>
              <canvas ref={waveformCanvas} width={1000} height={200} className="absolute inset-0 w-full h-full z-20 pointer-events-none" />
            </div>
            <div className="flex-1 h-full bg-black border border-[#222] flex items-center px-8 gap-8">
              <button
                type="button"
                onClick={togglePlay}
                disabled={!audioBuffer}
                className="w-16 h-16 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center shadow-xl"
              >
                {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
              </button>
              <div className="flex flex-col items-center min-w-[120px] tabular-nums border-x border-[#222] px-8">
                <span className="text-2xl font-black text-white leading-none">
                  {Math.floor(displayTime / 60)}:{(Math.floor(displayTime % 60)).toString().padStart(2, '0')}
                </span>
                <span className="text-[10px] text-zinc-700 font-black mt-2 tracking-widest uppercase">
                  Total: {Math.floor(duration / 60)}:{(Math.floor(duration % 60)).toString().padStart(2, '0')}
                </span>
              </div>
              <div className="flex-1 flex bg-[#0d0d0d] border border-[#222] p-1.5 gap-1.5">
                {(['before', 'after'] as const).map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setActiveSource(src)}
                    disabled={src === 'after' && !masterBuffer}
                    className={`flex-1 py-4 text-[11px] font-black transition-all border ${activeSource === src ? 'bg-[#333] text-white border-[#555] shadow-lg scale-[1.02] z-10' : 'text-zinc-700 border-transparent hover:text-zinc-500 disabled:opacity-40'}`}
                  >
                    {src === 'before' ? 'A: ' + (ja ? '処理前' : 'Before') : 'B: ' + (ja ? '処理後' : 'After')}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4 px-6 text-zinc-600">
                <Volume2 size={20} />
                <div className="w-32 h-1.5 bg-[#1a1a1a] relative">
                  <div className="absolute top-0 left-0 h-full w-[85%] bg-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="w-[380px] bg-[#0d0d0d] flex flex-col shrink-0 border-l border-[#222] overflow-y-auto">
          <div className="p-6 bg-[#111] border-b border-[#333]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[11px] font-black text-zinc-500 tracking-widest">IO</span>
              <Settings2 size={16} className="text-zinc-700" />
            </div>
            <div className="p-4 border border-[#333] bg-black">
              <span className="text-[8px] font-black text-zinc-600 uppercase block mb-1">A: MIXDOWN</span>
              <span className="text-[11px] font-black truncate block">{audioFile.name.toUpperCase()}</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-6 p-6 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <Metric label={ja ? '目標 LUFS' : 'Target LUFS'} val={selectedPreset.lufs} unit="dB" />
              <Metric label="Ceiling" val={selectedPreset.tp} unit="dB" />
            </div>

            <div className="flex-1 bg-black border border-[#222] flex flex-col overflow-hidden min-h-[280px]">
              <div className="p-4 border-b border-[#222] flex justify-between items-center bg-[#0a0a0a]">
                <div className="flex items-center gap-2">
                  <BrainCircuit size={16} className="text-blue-500" />
                  <span className="text-[10px] font-black uppercase text-zinc-400">{ja ? 'AI 精密解析' : 'AI Analysis'}</span>
                </div>
              </div>
              <div className="flex-1 p-5 overflow-y-auto">
                {isProcessing && (
                  <div className="h-full flex flex-col items-center justify-center opacity-60">
                    <RefreshCw size={48} className="animate-spin mb-4 text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                      {isAnalyzing ? (ja ? '解析中...' : 'Analyzing...') : (ja ? 'マスタリング中...' : 'Mastering...')}
                    </span>
                  </div>
                )}
                {!isProcessing && analysisData && !masteringParams && (
                  <DiagnosisReport
                    data={analysisData}
                    target={masteringTarget}
                    onTargetChange={onTargetChange}
                    onExecute={onExecuteMastering}
                    onChooseOtherFile={onResetUpload}
                    isMastering={false}
                    language={language}
                  />
                )}
                {!isProcessing && analysisData && masteringParams && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Metric label="LUFS" val={analysisData.lufs.toFixed(1)} unit="dB" color="text-blue-400" />
                      <Metric label="True Peak" val={analysisData.truePeak.toFixed(2)} unit="dB" color="text-amber-400" />
                      <Metric label={ja ? '位相相関' : 'Phase'} val={analysisData.phaseCorrelation.toFixed(2)} unit="" color="text-green-400" />
                      <Metric label={ja ? '歪み率' : 'THD'} val={analysisData.distortionPercent.toFixed(2)} unit="%" color="text-red-400" />
                    </div>
                    {masterMetrics && (
                      <div className="border-t border-[#333] pt-4">
                        <p className="text-[9px] font-black text-zinc-600 uppercase mb-2">{ja ? 'マスター実測' : 'Master measured'}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <Metric label="LUFS" val={masterMetrics.lufs.toFixed(1)} unit="dB" color="text-cyan-400" />
                          <Metric label="Peak" val={masterMetrics.peakDb.toFixed(2)} unit="dB" color="text-cyan-400" />
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={onOpenResults}
                      className="w-full py-3 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-black uppercase tracking-wider transition-colors"
                    >
                      {ja ? '結果を見る（聴く・購入）' : 'View result (listen & purchase)'}
                    </button>
                  </div>
                )}
                {!isProcessing && !analysisData && (
                  <div className="h-full flex flex-col items-center justify-center opacity-10">
                    <Activity size={80} strokeWidth={1} className="mb-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Data Waiting</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-[#0a0a0a] border border-[#222] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                <span className="text-[10px] font-black uppercase tracking-tighter">44.1kHz / 24bit PCM</span>
              </div>
              <AlertCircle size={14} className="text-zinc-800" />
            </div>
          </div>
        </aside>
      </main>

      {masteringParams && audioBuffer && analysisData && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          audioBuffer={audioBuffer}
          masteringParams={masteringParams}
          analysisData={analysisData}
          fileName={audioFile.name.replace(/\.[^/.]+$/, '')}
          language={language}
        />
      )}
    </div>
  );
}
