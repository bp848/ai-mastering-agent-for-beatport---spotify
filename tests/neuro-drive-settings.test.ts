import { describe, expect, it } from 'vitest';
import { resolveNeuroDriveSettings } from '../services/audioService';
import type { MasteringParams } from '../types';

const baseParams = (overrides: Partial<MasteringParams> = {}): MasteringParams => ({
  gain_adjustment_db: 0,
  limiter_ceiling_db: -1,
  eq_adjustments: [],
  tube_drive_amount: 0,
  exciter_amount: 0,
  low_contour_amount: 0,
  width_amount: 1,
  ...overrides,
});

describe('resolveNeuroDriveSettings', () => {
  it('keeps defaults conservative for clean masters', () => {
    const settings = resolveNeuroDriveSettings(baseParams());

    expect(settings.airShelfGainDb).toBeCloseTo(1.4, 6);
    expect(settings.wetMix).toBeCloseTo(0.09, 6);
  });

  it('increases air and wet mix gradually based on harmonic enhancement settings', () => {
    const settings = resolveNeuroDriveSettings(
      baseParams({
        exciter_amount: 0.08,
        tube_drive_amount: 1.6,
        gain_adjustment_db: 1.5,
        low_contour_amount: 0.6,
      }),
    );

    expect(settings.airShelfGainDb).toBeCloseTo(1.864, 3);
    expect(settings.wetMix).toBeCloseTo(0.142, 3);
  });

  it('adds loudness guard so high gain does not over-brighten', () => {
    const safer = resolveNeuroDriveSettings(baseParams({ exciter_amount: 0.1, gain_adjustment_db: 6 }));
    const normal = resolveNeuroDriveSettings(baseParams({ exciter_amount: 0.1, gain_adjustment_db: 2 }));

    expect(safer.airShelfGainDb).toBeLessThan(normal.airShelfGainDb);
  });

  it('caps the settings to avoid harsh highs and over-compression', () => {
    const settings = resolveNeuroDriveSettings(
      baseParams({
        exciter_amount: 0.8,
        tube_drive_amount: 6,
        gain_adjustment_db: 8,
      }),
    );

    expect(settings.airShelfGainDb).toBe(2.8);
    expect(settings.wetMix).toBe(0.17);
  });
});
