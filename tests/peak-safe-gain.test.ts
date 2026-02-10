import { describe, expect, it } from 'vitest';
import { __internal } from '../services/audioService';

describe('computePeakSafeGain', () => {
  it('reduces gain when measured peak exceeds ceiling target', () => {
    const nextGain = __internal.computePeakSafeGain(6, 0, -0.3);
    expect(nextGain).toBeLessThan(6);
  });

  it('keeps gain when measured peak is already safe', () => {
    const nextGain = __internal.computePeakSafeGain(6, -1.0, -0.3);
    expect(nextGain).toBe(6);
  });
});
