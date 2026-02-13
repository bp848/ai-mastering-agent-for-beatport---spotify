import { describe, expect, it } from 'vitest';
import { MASTERING_OVERSAMPLE_FACTOR } from '../services/audioService';

describe('audioService oversampling defaults', () => {
  it('uses x32 offline oversampling as default', () => {
    expect(MASTERING_OVERSAMPLE_FACTOR).toBe(32);
  });
});
