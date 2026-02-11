
import React, { useState } from 'react';
import type { AudioAnalysisData, MasteringTarget, MetricStatus } from '../types';
import FrequencyChart from './FrequencyChart';
import Waveform from './Waveform';
import { useTranslation } from '../contexts/LanguageContext';

interface AnalysisDisplayProps {
  data: AudioAnalysisData;
  isLoading: boolean;
  masteringTarget: MasteringTarget;
}

const targetValues = {
  beatport: {
    lufs: { good: [-9.0, -7.0], warn: [-10.0, -6.0], min: -20, max: -4, target: -8.0 },
    truePeak: { good: [-1.0, -0.3], warn: [-2.0, 0.0], min: -6, max: 1, target: -0.3 },
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
  const bgColor = status === 'good' ? 'bg-cyan-500/10 border-cyan-400/30' : status === 'warning' ? 'bg-amber-500/10 border-amber-400/30' : 'bg-red-500/10 border-red-400/30';
  return (
    <div className={`flex flex-col gap-1 p-4 rounded-xl ${bgColor} border`}>
      <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-extrabold font-mono ${color}`}>{value}</span>
      <span className="text-xs text-zinc-500 font-mono mt-1">{targetLabel}</span>
      <span className="text-xs text-zinc-400 font-medium">{gapText}</span>
    </div>
  );
};

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ data, masteringTarget }) => {
  const { t, language } = useTranslation();
  const isJa = language === 'ja';
  const lufsStatus = getStatus(data.lufs, masteringTarget, 'lufs');
  const peakStatus = getStatus(data.truePeak, masteringTarget, 'truePeak');
  const cfStatus = getStatus(data.crestFactor, masteringTarget, 'crestFactor');
  const tv = targetValues[masteringTarget];

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-lg shadow-cyan-400/50" />
          <p className="text-sm text-zinc-300 font-bold uppercase tracking-wider">
            {masteringTarget === 'beatport'
              ? (isJa ? 'Beatport Top 基準解析' : 'Beatport Top Standard Analysis')
              : (isJa ? 'Spotify 基準解析' : 'Spotify Standard Analysis')}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
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

      <section className="space-y-3 w-full">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-extrabold text-white uppercase tracking-wider">{t('analysis.waveform.title')}</p>
          <span className="text-xs text-zinc-500 font-mono">Level (normalized) · Time →</span>
        </div>
        <div className="w-full min-h-[180px] sm:min-h-[220px] p-5 rounded-xl bg-white/[0.04] border border-white/[0.12] overflow-hidden shadow-lg">
          <Waveform data={data.waveform} />
        </div>
      </section>

      <section className="space-y-3 w-full">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-extrabold text-white uppercase tracking-wider">{t('analysis.spectrum.title')}</p>
          <span className="text-xs text-zinc-500 font-mono">Band (Hz) · Level (dB)</span>
        </div>
        <div className="w-full min-h-[240px] sm:min-h-[300px] p-5 rounded-xl bg-white/[0.04] border border-white/[0.12] shadow-lg">
          <FrequencyChart data={data.frequencyData} />
        </div>
      </section>

      {/* プロ向け詳細メトリクス */}
      {(data.phaseCorrelation !== undefined || data.distortionPercent !== undefined || data.noiseFloorDb !== undefined) && (
        <section className="space-y-4 w-full">
          <p className="text-sm font-extrabold text-white uppercase tracking-wider">
            {isJa ? '最終検品（QC）メトリクス' : 'Final QC Metrics'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {data.phaseCorrelation !== undefined && (
              <div className="p-5 rounded-xl bg-white/[0.04] border border-white/[0.12]">
                <p className="text-xs text-zinc-400 mb-2 font-semibold uppercase tracking-wider">{isJa ? '位相相関' : 'Phase Correlation'}</p>
                <p className={`text-xl font-extrabold font-mono ${
                  data.phaseCorrelation > 0.5 ? 'text-green-400' :
                  data.phaseCorrelation > 0 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {data.phaseCorrelation.toFixed(3)}
                </p>
                <p className="text-xs text-zinc-500 mt-2">
                  {isJa 
                    ? data.phaseCorrelation > 0.5 ? '安全 (+1.0〜+0.5)' : data.phaseCorrelation > 0 ? '注意' : '危険 (モノ不適合)'
                    : data.phaseCorrelation > 0.5 ? 'Safe (+1.0~+0.5)' : data.phaseCorrelation > 0 ? 'Caution' : 'Danger (mono incompatible)'
                  }
                </p>
              </div>
            )}
            {data.distortionPercent !== undefined && (
              <div className="p-5 rounded-xl bg-white/[0.04] border border-white/[0.12]">
                <p className="text-xs text-zinc-400 mb-2 font-semibold uppercase tracking-wider">{isJa ? '歪み（THD近似）' : 'Distortion (THD est.)'}</p>
                <p className={`text-xl font-extrabold font-mono ${
                  data.distortionPercent < 0.1 ? 'text-green-400' :
                  data.distortionPercent < 0.5 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {data.distortionPercent.toFixed(2)}%
                </p>
                <p className="text-xs text-zinc-500 mt-2">
                  {isJa 
                    ? data.distortionPercent < 0.1 ? 'クリーン' : data.distortionPercent < 0.5 ? '軽微なクリッピング' : 'クリッピング検出'
                    : data.distortionPercent < 0.1 ? 'Clean' : data.distortionPercent < 0.5 ? 'Minor clipping' : 'Clipping detected'
                  }
                </p>
              </div>
            )}
            {data.noiseFloorDb !== undefined && (
              <div className="p-5 rounded-xl bg-white/[0.04] border border-white/[0.12]">
                <p className="text-xs text-zinc-400 mb-2 font-semibold uppercase tracking-wider">{isJa ? 'ノイズフロア' : 'Noise Floor'}</p>
                <p className={`text-xl font-extrabold font-mono ${
                  data.noiseFloorDb < -80 ? 'text-green-400' :
                  data.noiseFloorDb < -70 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {data.noiseFloorDb.toFixed(1)} dB
                </p>
                <p className="text-xs text-zinc-500 mt-2">
                  {isJa 
                    ? data.noiseFloorDb < -80 ? 'プロ基準 (-90dB以下)' : data.noiseFloorDb < -70 ? '許容範囲' : 'ノイズ検出'
                    : data.noiseFloorDb < -80 ? 'Pro standard (<-90dB)' : data.noiseFloorDb < -70 ? 'Acceptable' : 'Noise detected'
                  }
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default AnalysisDisplay;
