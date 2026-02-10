import { describe, expect, it } from 'vitest';
import type { AudioAnalysisData, MasteringParams } from '../types';
import { __internal } from '../services/aiService';

const baseParams: MasteringParams = {
  gain_adjustment_db: 6,
  limiter_ceiling_db: -0.2,
  eq_adjustments: [],
  tube_drive_amount: 2,
  exciter_amount: 0.12,
  low_contour_amount: 1,
  width_amount: 1.2,
};

const makeData = (overrides: Partial<AudioAnalysisData> = {}): AudioAnalysisData => ({
  lufs: -10,
  truePeak: -0.1,
  dynamicRange: 6,
  crestFactor: 8,
  stereoWidth: 0.8,
  peakRMS: 10,
  bassVolume: 0.5,
  phaseCorrelation: 0.5,
  distortionPercent: 1,
  noiseFloorDb: -40,
  frequencyData: [],
  waveform: [],
  ...overrides,
});

describe('applyAnalysisSafetyGuard', () => {
  it('reduces aggressive parameters when source has clipping risk', () => {
    const guarded = __internal.applyAnalysisSafetyGuard(baseParams, makeData());

    expect(guarded.gain_adjustment_db).toBe(3.5);
    expect(guarded.limiter_ceiling_db).toBe(-0.6);
    expect(guarded.tube_drive_amount).toBe(0.8);
    expect(guarded.exciter_amount).toBe(0.03);
    expect(guarded.low_contour_amount).toBe(0.7);
  });

  it('keeps parameters when source has healthy headroom and low distortion', () => {
    const guarded = __internal.applyAnalysisSafetyGuard(
      baseParams,
      makeData({ truePeak: -1.2, crestFactor: 12, distortionPercent: 0.2, noiseFloorDb: -60 }),
    );

    expect(guarded.gain_adjustment_db).toBe(6);
    expect(guarded.limiter_ceiling_db).toBe(-0.2);
    expect(guarded.eq_adjustments).toEqual([]);
  });
});
