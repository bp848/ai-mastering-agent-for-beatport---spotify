import { describe, expect, it } from 'vitest';
import type { MasteringParams } from '../types';
import { resolveAdaptiveMasteringSettings } from '../services/audioService';

const baseParams = (overrides: Partial<MasteringParams> = {}): MasteringParams => ({
  gain_adjustment_db: 0,
  eq_adjustments: [],
  limiter_ceiling_db: -1,
  tube_drive_amount: 0,
  exciter_amount: 0,
  low_contour_amount: 0,
  width_amount: 1,
  ...overrides,
});

describe('resolveAdaptiveMasteringSettings', () => {
  it('uses AI-derived values when in safe range', () => {
    const params = baseParams({
      tube_hpf_hz: 45,
      exciter_hpf_hz: 7500,
      transient_attack_s: 0.015,
      transient_release_s: 0.2,
      limiter_attack_s: 0.0015,
      limiter_release_s: 0.12,
    });
    const s = resolveAdaptiveMasteringSettings(params);
    expect(s.tubeHpfHz).toBe(45);
    expect(s.exciterHpfHz).toBe(7500);
    expect(s.transientAttackS).toBe(0.015);
    expect(s.transientReleaseS).toBe(0.2);
    expect(s.limiterAttackS).toBe(0.0015);
    expect(s.limiterReleaseS).toBe(0.12);
  });

  it('clamps out-of-range values to safe bounds', () => {
    const params = baseParams({
      tube_hpf_hz: 5,
      exciter_hpf_hz: 2000,
      transient_attack_s: 0.001,
      transient_release_s: 0.6,
      limiter_attack_s: 0.0001,
      limiter_release_s: 0.3,
    });
    const s = resolveAdaptiveMasteringSettings(params);
    expect(s.tubeHpfHz).toBe(20);
    expect(s.exciterHpfHz).toBe(4000);
    expect(s.transientAttackS).toBe(0.008);
    expect(s.transientReleaseS).toBe(0.5);
    expect(s.limiterAttackS).toBe(0.0005);
    expect(s.limiterReleaseS).toBe(0.25);
  });

  it('uses defaults when params are undefined', () => {
    const params = baseParams();
    const s = resolveAdaptiveMasteringSettings(params);
    expect(s.tubeHpfHz).toBe(30);
    expect(s.exciterHpfHz).toBe(6000);
    expect(s.transientAttackS).toBe(0.02);
    expect(s.transientReleaseS).toBe(0.25);
    expect(s.limiterAttackS).toBe(0.002);
    expect(s.limiterReleaseS).toBe(0.15);
  });
});
