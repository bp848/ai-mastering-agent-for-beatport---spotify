import { describe, expect, it } from 'vitest';
import { deriveSelfCorrectionGainStepCap, deriveSelfCorrectionWindowStarts } from '../services/audioService';

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

describe('deriveSelfCorrectionWindowStarts', () => {
  it('covers back-half and end sections to catch late distortion', () => {
    const sampleRate = 48000;
    const totalSamples = sampleRate * 120;
    const starts = deriveSelfCorrectionWindowStarts(totalSamples, sampleRate, 10);

    expect(starts.length).toBeGreaterThanOrEqual(4);
    expect(starts.at(-1)).toBe(totalSamples - sampleRate * 10);
    expect(starts.some((s) => s >= Math.floor(totalSamples * 0.75) - sampleRate)).toBe(true);
  });

  it('returns unique sorted starts and clamps short material safely', () => {
    const starts = deriveSelfCorrectionWindowStarts(2000, 48000, 10);
    expect(starts).toEqual([0]);
  });
});
