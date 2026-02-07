
import React, { useState } from 'react';
import type { AudioAnalysisData, MasteringTarget, MetricStatus } from '../types';
import FrequencyChart from './FrequencyChart';
import Waveform from './Waveform';
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

const getStatus = (value: number, target: MasteringTarget, metric: 'lufs' | 'truePeak' | 'crestFactor'): MetricStatus => {
  const limits = targetValues[target][metric];
  if (value >= limits.good[0] && value <= limits.good[1]) return 'good';
  if (value >= limits.warn[0] && value <= limits.warn[1]) return 'warning';
  return 'bad';
};

const MetricPill: React.FC<{ label: string; value: string; status: MetricStatus }> = ({ label, value, status }) => {
  const color = status === 'good' ? 'text-cyan-400' : status === 'warning' ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-zinc-500 font-medium">{label}</span>
      <span className={`text-lg font-bold font-mono ${color}`}>{value}</span>
    </div>
  );
};

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ data, masteringTarget, onTargetChange }) => {
  const { t } = useTranslation();
  const lufsStatus = getStatus(data.lufs, masteringTarget, 'lufs');
  const peakStatus = getStatus(data.truePeak, masteringTarget, 'truePeak');
  const cfStatus = getStatus(data.crestFactor, masteringTarget, 'crestFactor');

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4">
        <PlatformSelector currentTarget={masteringTarget} onTargetChange={onTargetChange} />
        <div className="flex gap-4 sm:gap-8 justify-between sm:justify-start flex-wrap">
          <MetricPill label={t('analysis.metric.lufs')} value={data.lufs.toFixed(1)} status={lufsStatus} />
          <MetricPill label={t('analysis.metric.peak')} value={data.truePeak.toFixed(1)} status={peakStatus} />
          <MetricPill label={t('analysis.metric.crest')} value={data.crestFactor.toFixed(1)} status={cfStatus} />
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <div className="p-3 sm:p-4 rounded-xl bg-black/30 border border-white/5 overflow-hidden">
          <Waveform data={data.waveform} />
        </div>
        <div className="h-32 min-h-[128px] p-3 sm:p-4 rounded-xl bg-black/30 border border-white/5">
          <FrequencyChart data={data.frequencyData} />
        </div>
      </div>
    </div>
  );
};

export default AnalysisDisplay;
