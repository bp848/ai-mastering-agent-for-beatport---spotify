import type { AudioAnalysisData, MasteringIntent, MasteringParams } from '../types';

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const bandLevel = (analysis: AudioAnalysisData, name: string): number =>
  analysis.frequencyData.find((f) => f.name === name)?.level ?? analysis.bassVolume;

const average = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const spread = (values: number[]): number => {
  if (values.length === 0) return 1;
  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance) || 1;
};

const normalizeByPopulation = (value: number, population: number[]): number => {
  const mean = average(population);
  const std = spread(population);
  return (value - mean) / std;
};

const levelWeight = (level: 'low' | 'mid' | 'high'): number => {
  if (level === 'low') return 0;
  if (level === 'mid') return 0.5;
  return 1;
};

const harshnessWeight = (level: 'none' | 'some' | 'strong'): number => {
  if (level === 'none') return 0;
  if (level === 'some') return 0.5;
  return 1;
};

const bassWeight = (level: 'thin' | 'normal' | 'thick'): number => {
  if (level === 'thin') return 0;
  if (level === 'normal') return 0.5;
  return 1;
};

const stereoWeight = (level: 'narrow' | 'normal' | 'wide'): number => {
  if (level === 'narrow') return 0;
  if (level === 'normal') return 0.5;
  return 1;
};

const deriveHpFrequency = (analysis: AudioAnalysisData, focus: number): number => {
  const lows = [bandLevel(analysis, '20-60'), bandLevel(analysis, '60-250')];
  const highs = [bandLevel(analysis, '4k-8k'), bandLevel(analysis, '8k-20k')];
  const lowVsHigh = normalizeByPopulation(average(lows) - average(highs), [...lows, ...highs, analysis.crestFactor]);
  const base = Math.abs(analysis.bassVolume) + Math.abs(analysis.crestFactor);
  return Math.abs(base * (1 + lowVsHigh + focus));
};

export function deriveMasteringParamsFromIntent(
  intent: MasteringIntent,
  analysis: AudioAnalysisData,
): MasteringParams {
  const harmonicBands = [
    bandLevel(analysis, '250-1k'),
    bandLevel(analysis, '1k-4k'),
    bandLevel(analysis, '4k-8k'),
    bandLevel(analysis, '8k-20k'),
  ];
  const harmonicCenter = average(harmonicBands);
  const crestNorm = normalizeByPopulation(analysis.crestFactor, [analysis.crestFactor, analysis.dynamicRange, Math.abs(analysis.truePeak)]);
  const dynamicNorm = normalizeByPopulation(analysis.dynamicRange, [analysis.dynamicRange, analysis.crestFactor, Math.abs(analysis.truePeak)]);
  const harshNorm = normalizeByPopulation(bandLevel(analysis, '4k-8k') + bandLevel(analysis, '8k-20k'), harmonicBands);
  const bassNorm = normalizeByPopulation(analysis.bassVolume + bandLevel(analysis, '20-60'), [analysis.bassVolume, ...harmonicBands]);

  const kickWeight = levelWeight(intent.kickRisk);
  const transientWeight = levelWeight(intent.transientRisk);
  const bassIntentWeight = bassWeight(intent.bassDensity);
  const harshIntentWeight = harshnessWeight(intent.highHarshness);
  const stereoIntentWeight = stereoWeight(intent.stereoNeed);

  const gainAdjustment = (dynamicNorm - kickWeight - transientWeight) * (1 + bassNorm);
  const limiterCeiling = analysis.truePeak - Math.abs(dynamicNorm + harshNorm + transientWeight);

  const lowContour = clamp((bassIntentWeight + bassNorm) / 2, 0, 1);
  const width = clamp(1 + stereoIntentWeight * (analysis.stereoWidth / (Math.abs(analysis.stereoWidth) + Math.abs(analysis.phaseCorrelation * 100) + 1)), 0.5, 2);

  const eq_adjustments = [
    {
      type: 'peak' as const,
      frequency: Math.abs(deriveHpFrequency(analysis, bassIntentWeight)),
      gain_db: (harmonicCenter - bandLevel(analysis, '250-1k')) * (1 - bassIntentWeight),
      q: Math.abs(analysis.dynamicRange / (Math.abs(analysis.crestFactor) + 1)),
    },
    {
      type: 'peak' as const,
      frequency: Math.abs(deriveHpFrequency(analysis, harshIntentWeight + transientWeight)),
      gain_db: (harmonicCenter - bandLevel(analysis, '4k-8k')) * (1 - harshIntentWeight),
      q: Math.abs(analysis.crestFactor / (Math.abs(analysis.dynamicRange) + 1)),
    },
  ];

  const tubeDrive = Math.abs((kickWeight + transientWeight + bassIntentWeight + crestNorm) * (1 + analysis.distortionPercent / 100));
  const exciterAmount = Math.abs((1 - harshIntentWeight) * (1 + harshNorm + analysis.phaseCorrelation));

  const transientAttack = Math.abs(analysis.dynamicRange / (Math.abs(analysis.peakRMS) + Math.abs(analysis.truePeak) + 1));
  const transientRelease = Math.abs(analysis.crestFactor / (Math.abs(analysis.dynamicRange) + Math.abs(analysis.peakRMS) + 1));

  return {
    gain_adjustment_db: gainAdjustment,
    limiter_ceiling_db: limiterCeiling,
    eq_adjustments,
    tube_drive_amount: tubeDrive,
    exciter_amount: exciterAmount,
    low_contour_amount: lowContour,
    width_amount: width,
    tube_hpf_hz: deriveHpFrequency(analysis, bassIntentWeight + kickWeight),
    exciter_hpf_hz: deriveHpFrequency(analysis, harshIntentWeight + transientWeight),
    transient_attack_s: transientAttack,
    transient_release_s: transientRelease,
    limiter_attack_s: transientAttack / (1 + transientWeight),
    limiter_release_s: transientRelease * (1 + bassIntentWeight),
  };
}
