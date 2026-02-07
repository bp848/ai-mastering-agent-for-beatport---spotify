
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { MasteringParams } from '../types';
// Added AiProposeIcon to the import list to resolve the "Cannot find name 'AiProposeIcon'" error.
import { AgentIcon, Spinner, DownloadIcon, GainIcon, LimiterIcon, EQIcon, PlayIcon, PauseIcon, AiProposeIcon } from './Icons';
import { useTranslation } from '../contexts/LanguageContext';

interface MasteringAgentProps {
  params: MasteringParams | null;
  isLoading: boolean;
  onDownloadMastered: () => void;
  isProcessingAudio: boolean;
  audioBuffer: AudioBuffer | null;
}

const ParameterDisplay: React.FC<{ params: MasteringParams }> = ({ params }) => {
  const { t } = useTranslation();
  return (
    <div className="relative flex flex-col md:flex-row items-stretch gap-4 md:gap-0">
      {/* Visual Signal Path */}
      <div className="flex-1 flex flex-col items-center p-6 bg-white/5 rounded-2xl md:rounded-r-none border border-white/5 relative group hover:bg-white/[0.07] transition-all">
        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><EQIcon /></div>
        <p className="text-[8px] text-gray-500 font-black uppercase tracking-[0.2em] mb-4">Signal Stage 01: Correction</p>
        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 mb-4 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
          <EQIcon />
        </div>
        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">{t('agent.params.eq')}</p>
        <p className="font-mono text-sm font-black text-white">
          {params.eq_adjustments.length > 0 ? `${params.eq_adjustments.length} Active Bands` : 'Transparent'}
        </p>
      </div>

      <div className="hidden md:flex items-center justify-center w-8 -mx-4 z-10">
        <div className="h-[2px] w-full bg-gradient-to-r from-blue-500/50 to-emerald-500/50"></div>
      </div>

      <div className="flex-1 flex flex-col items-center p-6 bg-white/5 rounded-2xl md:rounded-none border border-white/5 relative group hover:bg-white/[0.07] transition-all">
        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><GainIcon /></div>
        <p className="text-[8px] text-gray-500 font-black uppercase tracking-[0.2em] mb-4">Signal Stage 02: Elevation</p>
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          <GainIcon />
        </div>
        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">{t('agent.params.gain')}</p>
        <p className="font-mono text-sm font-black text-white">+{params.gain_adjustment_db.toFixed(1)} dB</p>
      </div>

      <div className="hidden md:flex items-center justify-center w-8 -mx-4 z-10">
        <div className="h-[2px] w-full bg-gradient-to-r from-emerald-500/50 to-purple-500/50"></div>
      </div>

      <div className="flex-1 flex flex-col items-center p-6 bg-white/5 rounded-2xl md:rounded-l-none border border-white/5 relative group hover:bg-white/[0.07] transition-all">
        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><LimiterIcon /></div>
        <p className="text-[8px] text-gray-500 font-black uppercase tracking-[0.2em] mb-4">Signal Stage 03: Finalizing</p>
        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 mb-4 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
          <LimiterIcon />
        </div>
        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">{t('agent.params.limiter')}</p>
        <p className="font-mono text-sm font-black text-white">{params.limiter_ceiling_db.toFixed(1)} dBTP</p>
      </div>
    </div>
  );
};

const AudioPreview: React.FC<{
  audioBuffer: AudioBuffer;
  params: MasteringParams;
}> = ({ audioBuffer, params }) => {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBypassed, setIsBypassed] = useState(true);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const nodesRef = useRef<{
    bypassGain: GainNode | null;
    masteredGain: GainNode | null;
  }>({ bypassGain: null, masteredGain: null });

  const setupAudioGraph = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error);
    }
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = context;
    const bypassGain = context.createGain();
    const masteredGain = context.createGain();
    bypassGain.connect(context.destination);
    masteredGain.connect(context.destination);
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
        const filterNode = context.createBiquadFilter();
        filterNode.type = eq.type;
        filterNode.frequency.value = eq.frequency;
        filterNode.gain.value = eq.gain_db;
        filterNode.Q.value = eq.q;
        lastNode.connect(filterNode);
        lastNode = filterNode;
      }
    }
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = params.limiter_ceiling_db;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.05;
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
      if (sourceRef.current) try { sourceRef.current.stop(); } catch (e) {}
      if (audioContextRef.current) audioContextRef.current.close().catch(console.error);
    };
  }, []);

  useEffect(() => {
    if (nodesRef.current.bypassGain && nodesRef.current.masteredGain && audioContextRef.current) {
      const now = audioContextRef.current.currentTime;
      nodesRef.current.bypassGain.gain.setTargetAtTime(isBypassed ? 1.0 : 0.0, now, 0.08);
      nodesRef.current.masteredGain.gain.setTargetAtTime(isBypassed ? 0.0 : 1.0, now, 0.08);
    }
  }, [isBypassed]);

  const togglePlay = () => {
    if (isPlaying) {
      sourceRef.current?.stop();
      setIsPlaying(false);
    } else {
      if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
      if (!sourceRef.current) setupAudioGraph();
      sourceRef.current?.start(0);
      setIsPlaying(true);
    }
  };

  return (
    <div className="relative p-8 bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] rounded-3xl border border-white/5 shadow-2xl overflow-hidden group">
      {/* Background Pulse */}
      {isPlaying && (
        <div className="absolute inset-0 bg-emerald-500/5 animate-pulse pointer-events-none"></div>
      )}

      <div className="relative flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-2">
           <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">{t('agent.preview.title')}</h4>
           <div className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${isPlaying ? 'border-emerald-500/50 text-emerald-500' : 'border-gray-800 text-gray-700'}`}>
              {isPlaying ? 'Engine Running' : 'Standby'}
           </div>
        </div>

        <div className="flex items-center gap-10">
            <button 
                onClick={() => setIsBypassed(true)}
                className={`group flex flex-col items-center gap-3 transition-all duration-500 ${isBypassed ? 'scale-110' : 'opacity-30 grayscale blur-[1px] hover:opacity-50'}`}
            >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${isBypassed ? 'bg-white/5 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'border-white/10'}`}>
                  <div className="w-6 h-6"><PlayIcon /></div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">{t('agent.preview.original')}</span>
            </button>

            <button onClick={togglePlay} className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center group">
              <div className={`absolute inset-0 bg-emerald-600 rounded-full transition-all duration-500 ${isPlaying ? 'scale-110 opacity-20 animate-ping' : 'scale-100 opacity-0'}`}></div>
              <div className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-90 ${isPlaying ? 'bg-emerald-500 text-white shadow-[0_0_40px_rgba(16,185,129,0.5)]' : 'bg-white/10 text-gray-400 hover:bg-white/20'}`}>
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </div>
            </button>

            <button 
                onClick={() => setIsBypassed(false)}
                className={`group flex flex-col items-center gap-3 transition-all duration-500 ${!isBypassed ? 'scale-110' : 'opacity-30 grayscale blur-[1px] hover:opacity-50'}`}
            >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${!isBypassed ? 'bg-white/5 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'border-white/10'}`}>
                   <div className="w-6 h-6"><AiProposeIcon /></div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">{t('agent.preview.mastered')}</span>
            </button>
        </div>
        
        <p className="max-w-xs text-center text-[9px] text-gray-600 font-bold uppercase tracking-widest leading-relaxed">
           Switch seamlessly between bypass and mastered chain to verify dynamic integrity.
        </p>
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

  if (isLoading || !params) return null;

  return (
    <div className="space-y-12 animate-in slide-in-from-top-6 duration-1000">
      <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500 w-12 h-12 flex items-center justify-center shadow-lg"><AgentIcon /></div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-[0.2em]">{t('agent.params.title')}</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Calculated via Gemini-3-Pro Mastering Logic</p>
            </div>
          </div>
      </div>

      <ParameterDisplay params={params} />
      
      {audioBuffer && <AudioPreview audioBuffer={audioBuffer} params={params} />}
      
      <div className="flex flex-col gap-4">
        <button
          onClick={onDownloadMastered}
          disabled={isProcessingAudio}
          className="group relative w-full flex items-center justify-center gap-3 bg-white text-black font-black text-sm uppercase py-6 px-8 rounded-3xl hover:bg-emerald-500 hover:text-white transition-all duration-500 transform active:scale-[0.98] shadow-[0_20px_40px_rgba(0,0,0,0.4)] overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative flex items-center gap-3">
            {isProcessingAudio ? (
              <>
                <div className="w-6 h-6"><Spinner /></div>
                <span>{t('agent.button.processing')}</span>
              </>
            ) : (
              <>
                <DownloadIcon />
                <span>{t('agent.button.download')}</span>
              </>
            )}
          </div>
        </button>
        <p className="text-center text-[8px] text-gray-700 font-black uppercase tracking-[0.3em]">High-Fidelity 32-bit Float Internal Processing</p>
      </div>
    </div>
  );
};

export default MasteringAgent;
