
import React, { useState } from 'react';
import type { AudioAnalysisData, MasteringTarget, MetricStatus } from '../types';
import MetricCard from './MetricCard';
import FrequencyChart from './FrequencyChart';
import Waveform from './Waveform';
import { ClipboardIcon } from './Icons';
import PlatformSelector from './PlatformSelector';
import { useTranslation } from '../contexts/LanguageContext';

interface AnalysisDisplayProps {
  data: AudioAnalysisData;
  isLoading: boolean;
  masteringTarget: MasteringTarget;
  onTargetChange: (target: MasteringTarget) => void;
}

const targetValues = {
  beatport: {
    lufs: { good: [-8.0, -6.0], warn: [-10.0, -5.0], min: -20, max: -4 },
    truePeak: { good: [-1.0, -0.1], warn: [-2.0, 0.0], min: -6, max: 1 },
    crestFactor: { good: [5.0, 8.0], warn: [4.0, 10.0], min: 2, max: 15 },
  },
  spotify: {
    lufs: { good: [-15.0, -13.0], warn: [-16.0, -12.0], min: -24, max: -8 },
    truePeak: { good: [-2.0, -1.0], warn: [-3.0, -0.5], min: -6, max: 0 },
    crestFactor: { good: [9.0, 15.0], warn: [8.0, 18.0], min: 5, max: 20 },
  },
};

const getMetricStatus = (value: number, target: MasteringTarget, metric: 'lufs' | 'truePeak' | 'crestFactor'): MetricStatus => {
  const limits = targetValues[target][metric];
  if (value >= limits.good[0] && value <= limits.good[1]) return 'good';
  if (value >= limits.warn[0] && value <= limits.warn[1]) return 'warning';
  return 'bad';
};

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ data, masteringTarget, onTargetChange }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const lufsStatus = getMetricStatus(data.lufs, masteringTarget, 'lufs');
  const peakStatus = getMetricStatus(data.truePeak, masteringTarget, 'truePeak');
  const cfStatus = getMetricStatus(data.crestFactor, masteringTarget, 'crestFactor');

  const lufsTargetText = t(`analysis.target.${masteringTarget}.lufs`);
  const peakTargetText = t(`analysis.target.${masteringTarget}.peak`);
  const crestTargetText = t(`analysis.target.${masteringTarget}.crest`);

  const handleCopyResults = () => {
    const report = `[ANALYSIS] ${masteringTarget.toUpperCase()}\nLUFS: ${data.lufs.toFixed(2)}\nPeak: ${data.truePeak.toFixed(2)}\nCrest: ${data.crestFactor.toFixed(2)}`;
    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-10">
      {/* Header: Platform & Tools */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
        <div className="flex-grow max-w-md">
          <PlatformSelector currentTarget={masteringTarget} onTargetChange={onTargetChange} />
        </div>
        <button
          onClick={handleCopyResults}
          className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-gray-400 text-[9px] font-black uppercase py-2.5 px-5 rounded-full border border-white/5 transition-all active:scale-95 self-center md:self-end"
        >
          <div className="w-3.5 h-3.5"><ClipboardIcon /></div>
          {copied ? t('common.copied') : t('analysis.button.copy')}
        </button>
      </div>
      
      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Left Col: Waveform & Primary Metrics */}
        <div className="xl:col-span-7 space-y-10">
            <div className="relative group">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">{t('analysis.waveform.title')}</h3>
                  <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">High-Density Audio Stream</span>
                </div>
                <div className="p-4 bg-black/40 rounded-2xl border border-white/5 backdrop-blur-sm group-hover:border-emerald-500/20 transition-all duration-500">
                  <Waveform data={data.waveform} />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MetricCard 
                  title={t('analysis.metric.lufs')} 
                  value={data.lufs.toFixed(1)} 
                  numValue={data.lufs}
                  status={lufsStatus} 
                  target={lufsTargetText}
                  min={targetValues[masteringTarget].lufs.min}
                  max={targetValues[masteringTarget].lufs.max}
                />
                <MetricCard 
                  title={t('analysis.metric.peak')} 
                  value={data.truePeak.toFixed(1)} 
                  numValue={data.truePeak}
                  status={peakStatus} 
                  target={peakTargetText}
                  min={targetValues[masteringTarget].truePeak.min}
                  max={targetValues[masteringTarget].truePeak.max}
                />
                <MetricCard 
                  title={t('analysis.metric.crest')} 
                  value={data.crestFactor.toFixed(1)} 
                  numValue={data.crestFactor}
                  status={cfStatus} 
                  target={crestTargetText}
                  min={targetValues[masteringTarget].crestFactor.min}
                  max={targetValues[masteringTarget].crestFactor.max}
                />
                <MetricCard 
                  title={t('analysis.metric.width')} 
                  value={data.stereoWidth.toFixed(0) + '%'} 
                  numValue={data.stereoWidth}
                  status="neutral" 
                  target={t('analysis.target.subjective')}
                  min={0}
                  max={100}
                />
            </div>
        </div>

        {/* Right Col: Spectrum & Secondary Metrics */}
        <div className="xl:col-span-5 space-y-10">
            <div className="relative group">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">{t('analysis.spectrum.title')}</h3>
                  <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">FFT Real-time Decomposition</span>
                </div>
                <div className="h-64 bg-black/40 p-4 rounded-2xl border border-white/5 backdrop-blur-sm group-hover:border-emerald-500/20 transition-all duration-500 shadow-inner">
                    <FrequencyChart data={data.frequencyData} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-2">{t('analysis.metric.rms')}</p>
                    <p className="text-xl font-mono font-bold text-white">{data.peakRMS.toFixed(1)} dB</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest mb-2">{t('analysis.metric.bass')}</p>
                    <p className="text-xl font-mono font-bold text-white">{data.bassVolume.toFixed(1)} dB</p>
                </div>
            </div>
            
            <div className="p-6 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 italic text-[10px] text-emerald-300/60 leading-relaxed font-medium">
              "Mastering Techno and Trance requires a careful balance between extreme loudness and transient impact. The analysis above highlights the critical headroom needed for club playback."
            </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisDisplay;
