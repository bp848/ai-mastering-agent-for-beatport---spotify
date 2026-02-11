import { describe, expect, it } from 'vitest';
import { deriveSelfCorrectionGainStepCap } from '../services/audioService';

describe('deriveSelfCorrectionGainStepCap', () => {
  it('derives default cap from LUFS tolerance', () => {
    expect(deriveSelfCorrectionGainStepCap(1.0, undefined)).toBeCloseTo(0.35, 6);
    expect(deriveSelfCorrectionGainStepCap(0.5, undefined)).toBeCloseTo(0.2, 6);
    expect(deriveSelfCorrectionGainStepCap(2.0, undefined)).toBeCloseTo(0.7, 6);
  });

  it('clamps configured max gain step into safe range', () => {
    expect(deriveSelfCorrectionGainStepCap(1.0, 0.05)).toBe(0.2);
    expect(deriveSelfCorrectionGainStepCap(1.0, 1.2)).toBe(0.8);
    expect(deriveSelfCorrectionGainStepCap(1.0, 0.45)).toBe(0.45);
  });
});
