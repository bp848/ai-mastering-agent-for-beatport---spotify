import { describe, expect, it } from 'vitest';
import type { AIDecision, AudioAnalysisData } from '../types';
import { deriveMasteringParamsFromDecision } from '../services/masteringDerivation';
import { clampMasteringParams } from '../services/geminiService';

const decisionBase: AIDecision = {
  kickSafety: 'safe',
  saturationNeed: 'light',
  transientHandling: 'preserve',
  highFreqTreatment: 'polish',
  stereoIntent: 'wide',
  confidence: 0.9,
};

const analysisBase = (overrides: Partial<AudioAnalysisData> = {}): AudioAnalysisData => ({
  lufs: -12,
  truePeak: -2,
  dynamicRange: 10,
  crestFactor: 10,
  stereoWidth: 70,
  peakRMS: -14,
  bassVolume: -14,
  phaseCorrelation: 0.7,
  distortionPercent: 0.2,
  noiseFloorDb: -90,
  frequencyData: [
    { name: '20-60', level: -17 },
    { name: '60-250', level: -14 },
    { name: '250-1k', level: -30 },
    { name: '1k-4k', level: -36 },
    { name: '4k-8k', level: -42 },
    { name: '8k-20k', level: -48 },
  ],
  waveform: [],
  ...overrides,
});

describe('deriveMasteringParamsFromDecision adaptive low-end DSP', () => {
  it('keeps platform targets fixed while allowing decision-driven parameter changes', () => {
    const analysis = analysisBase();
    const conservative = deriveMasteringParamsFromDecision(
      {
        ...decisionBase,
        saturationNeed: 'none',
        highFreqTreatment: 'leave',
        stereoIntent: 'narrow',
      },
      analysis,
      'beatport',
    );
    const aggressive = deriveMasteringParamsFromDecision(
      {
        ...decisionBase,
        saturationNeed: 'heavy',
        highFreqTreatment: 'lift',
        stereoIntent: 'wide',
      },
      analysis,
      'beatport',
    );
    expect(conservative.target_lufs).toBe(aggressive.target_lufs);
    expect(conservative.limiter_ceiling_db).toBe(aggressive.limiter_ceiling_db);
    expect(conservative.tube_drive_amount).toBeLessThan(aggressive.tube_drive_amount);
    expect(conservative.exciter_amount).toBeLessThan(aggressive.exciter_amount);
    expect(conservative.width_amount).toBeLessThan(aggressive.width_amount);
  });

  it('forces safer low-end image and contour when collision risk is high', () => {
    const derived = deriveMasteringParamsFromDecision(
      decisionBase,
      analysisBase({
        truePeak: -0.2,
        crestFactor: 7.5,
        phaseCorrelation: 0.05,
        distortionPercent: 1.8,
        frequencyData: [
          { name: '20-60', level: -12 },
          { name: '60-250', level: -10 },
          { name: '250-1k', level: -26 },
          { name: '1k-4k', level: -32 },
          { name: '4k-8k', level: -38 },
          { name: '8k-20k', level: -44 },
        ],
      }),
      'beatport',
    );

    expect(derived.width_amount).toBeLessThanOrEqual(1.05);
    expect(derived.low_contour_amount).toBeLessThan(0.25);
    expect(derived.low_mono_hz).toBeGreaterThanOrEqual(220);
  });

  it('adds harmonic presence support for clean but bass-heavy material', () => {
    const derived = deriveMasteringParamsFromDecision(
      decisionBase,
      analysisBase({
        bassVolume: -12,
        distortionPercent: 0.2,
        phaseCorrelation: 0.8,
        frequencyData: [
          { name: '20-60', level: -18 },
          { name: '60-250', level: -12 },
          { name: '250-1k', level: -34 },
          { name: '1k-4k', level: -36 },
          { name: '4k-8k', level: -44 },
          { name: '8k-20k', level: -48 },
        ],
      }),
      'beatport',
    );

    expect(derived.tube_drive_amount).toBeGreaterThan(0.8);
    expect(derived.low_mono_hz).toBeGreaterThanOrEqual(120);
    expect(derived.eq_adjustments.some((eq) => eq.frequency === 700 && eq.gain_db > 0)).toBe(true);
  });

  it('clamps low_mono_hz in safety layer', () => {
    const clamped = clampMasteringParams({
      gain_adjustment_db: 0,
      limiter_ceiling_db: -1,
      eq_adjustments: [],
      tube_drive_amount: 0,
      exciter_amount: 0,
      low_contour_amount: 0,
      width_amount: 1,
      low_mono_hz: 500,
    });

    expect(clamped.low_mono_hz).toBe(320);
  });
});
