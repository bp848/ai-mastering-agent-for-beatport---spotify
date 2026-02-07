
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
    lufs: { good: [-8.0, -6.0], warn: [-10.0, -5.0], min: -20, max: -4, target: -7.0 },
    truePeak: { good: [-1.0, -0.1], warn: [-2.0, 0.0], min: -6, max: 1, target: -0.1 },
    crestFactor: { good: [5.0, 8.0], warn: [4.0, 10.0], min: 2, max: 15, target: 6.5 },
  },
  spotify: {
    lufs: { good: [-15.0, -13.0], warn: [-16.0, -12.0], min: -24, max: -8, target: -14.0 },
    truePeak: { good: [-2.0, -1.0], warn: [-3.0, -0.5], min: -6, max: 0, target: -1.0 },
    crestFactor: { good: [9.0, 15.0], warn: [8.0, 18.0], min: 5, max: 20, target: 12 },
  },
};

const getStatus = (value: number, target: MasteringTarget, metric: 'lufs' | 'truePeak' | 'crestFactor'): MetricStatus => {
  const limits = targetValues[target][metric];
  if (value >= limits.good[0] && value <= limits.good[1]) return 'good';
  if (value >= limits.warn[0] && value <= limits.warn[1]) return 'warning';
  return 'bad';
};

/** LUFS: 現在値 vs 目標 → 不足/超過を表示。TP/Crest も目標との差を明示。 */
const formatGap = (current: number, target: number, metric: 'lufs' | 'truePeak' | 'crestFactor'): string => {
  const gap = metric === 'lufs' ? target - current : current - target; // LUFS は「目標まであと何dB」、他は現在-目標
  if (metric === 'lufs') {
    if (gap > 0) return `目標まで +${gap.toFixed(1)} dB`;
    if (gap < 0) return `目標超過 ${gap.toFixed(1)} dB`;
  }
  if (metric === 'truePeak') {
    if (current > target) return `クリップ危険 (目標 ${target} dBTP)`;
    return `目標 ${target} dBTP`;
  }
  return `目標 ${target} 前後`;
};

const MetricPill: React.FC<{
  label: string;
  value: string;
  status: MetricStatus;
  targetLabel: string;
  gapText: string;
}> = ({ label, value, status, targetLabel, gapText }) => {
  const color = status === 'good' ? 'text-cyan-400' : status === 'warning' ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-zinc-500 font-medium">{label}</span>
      <span className={`text-lg font-bold font-mono ${color}`}>{value}</span>
      <span className="text-[10px] text-zinc-600 font-mono">{targetLabel}</span>
      <span className="text-[9px] text-zinc-500">{gapText}</span>
    </div>
  );
};

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ data, masteringTarget, onTargetChange }) => {
  const { t, language } = useTranslation();
  const isJa = language === 'ja';
  const lufsStatus = getStatus(data.lufs, masteringTarget, 'lufs');
  const peakStatus = getStatus(data.truePeak, masteringTarget, 'truePeak');
  const cfStatus = getStatus(data.crestFactor, masteringTarget, 'crestFactor');
  const tv = targetValues[masteringTarget];

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <PlatformSelector currentTarget={masteringTarget} onTargetChange={onTargetChange} />
          <p className="text-[10px] text-zinc-500 font-medium">
            {isJa ? 'Beatport top 基準・忖度なしの解析' : 'Beatport top standard · no-deference analysis'}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 sm:gap-6">
          <MetricPill
            label={t('analysis.metric.lufs')}
            value={data.lufs.toFixed(1)}
            status={lufsStatus}
            targetLabel={isJa ? `目標 ${tv.lufs.target} LUFS` : `Target ${tv.lufs.target} LUFS`}
            gapText={formatGap(data.lufs, tv.lufs.target, 'lufs')}
          />
          <MetricPill
            label={t('analysis.metric.peak')}
            value={data.truePeak.toFixed(1)}
            status={peakStatus}
            targetLabel={isJa ? `目標 ${tv.truePeak.target} dBTP` : `Target ${tv.truePeak.target} dBTP`}
            gapText={formatGap(data.truePeak, tv.truePeak.target, 'truePeak')}
          />
          <MetricPill
            label={t('analysis.metric.crest')}
            value={data.crestFactor.toFixed(1)}
            status={cfStatus}
            targetLabel={isJa ? `目標 約 ${tv.crestFactor.target}` : `Target ~${tv.crestFactor.target}`}
            gapText={formatGap(data.crestFactor, tv.crestFactor.target, 'crestFactor')}
          />
        </div>
      </section>

      <section className="space-y-2 w-full">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{t('analysis.waveform.title')}</p>
          <span className="text-[10px] text-zinc-600 font-mono">Level (normalized) · Time →</span>
        </div>
        <div className="w-full min-h-[160px] sm:min-h-[200px] p-4 rounded-xl bg-white/[0.03] border border-white/10 overflow-hidden">
          <Waveform data={data.waveform} />
        </div>
      </section>

      <section className="space-y-2 w-full">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{t('analysis.spectrum.title')}</p>
          <span className="text-[10px] text-zinc-600 font-mono">Band (Hz) · Level (dB)</span>
        </div>
        <div className="w-full min-h-[200px] sm:min-h-[260px] p-4 rounded-xl bg-white/[0.03] border border-white/10">
          <FrequencyChart data={data.frequencyData} />
        </div>
      </section>
    </div>
  );
};

export default AnalysisDisplay;
