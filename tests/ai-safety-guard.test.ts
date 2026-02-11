import { describe, it, expect } from 'vitest';
import { applySafetyGuard } from '../services/geminiService';
import type { MasteringParams, AudioAnalysisData } from '../types';

const baseParams = (overrides: Partial<MasteringParams> = {}): MasteringParams => ({
  gain_adjustment_db: 0,
  limiter_ceiling_db: -0.5,
  eq_adjustments: [],
  tube_drive_amount: 1.0,
  exciter_amount: 0.4,
  low_contour_amount: 0,
  width_amount: 1,
  ...overrides,
});

const baseAnalysis = (overrides: Partial<AudioAnalysisData> = {}): AudioAnalysisData =>
  ({
    lufs: -14,
    truePeak: -3,
    crestFactor: 12,
    distortionPercent: 0.5,
    stereoWidth: 60,
    peakRMS: -18,
    bassVolume: -12,
    phaseCorrelation: 0.9,
    noiseFloorDb: -80,
    frequencyData: [],
    waveform: [],
    dynamicRange: 12,
    ...overrides,
  }) as AudioAnalysisData;

describe('applySafetyGuard', () => {
  it('returns finite values for all guarded controls', () => {
    const out = applySafetyGuard(baseParams(), baseAnalysis());
    expect(Number.isFinite(out.tube_drive_amount)).toBe(true);
    expect(Number.isFinite(out.exciter_amount)).toBe(true);
    expect(Number.isFinite(out.limiter_ceiling_db)).toBe(true);
  });

  it('reduces tube and exciter under higher pressure profile', () => {
    const params = baseParams({ tube_drive_amount: 2, exciter_amount: 1 });
    const calm = applySafetyGuard(params, baseAnalysis({ truePeak: -10, distortionPercent: 0.1, crestFactor: 15 }));
    const stressed = applySafetyGuard(params, baseAnalysis({ truePeak: -0.2, distortionPercent: 8, crestFactor: 4 }));

    expect(stressed.tube_drive_amount).toBeLessThan(calm.tube_drive_amount);
    expect(stressed.exciter_amount).toBeLessThan(calm.exciter_amount);
  });

  it('pushes limiter ceiling lower when pressure profile increases', () => {
    const params = baseParams({ limiter_ceiling_db: -0.1 });
    const calm = applySafetyGuard(params, baseAnalysis({ truePeak: -8, distortionPercent: 0.1 }));
    const stressed = applySafetyGuard(params, baseAnalysis({ truePeak: 0.5, distortionPercent: 12 }));

    expect(stressed.limiter_ceiling_db).toBeLessThan(calm.limiter_ceiling_db);
  });

  it('keeps limiter ceiling in bounded production-safe range', () => {
    const out = applySafetyGuard(
      baseParams({ limiter_ceiling_db: 1 }),
      baseAnalysis({ truePeak: 2, distortionPercent: 300, crestFactor: 0.5, dynamicRange: 0.5, phaseCorrelation: -1 }),
    );

    expect(out.limiter_ceiling_db).toBeGreaterThanOrEqual(-2.4);
    expect(out.limiter_ceiling_db).toBeLessThanOrEqual(-0.6);
  });
});
