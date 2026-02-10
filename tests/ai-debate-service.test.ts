import { describe, it, expect } from 'vitest';
import { normalizeDecision, reconcileDecisions } from '../services/aiDebateService';
import type { AIDecision } from '../types';

describe('normalizeDecision', () => {
  it('fills defaults and clamps confidence', () => {
    const normalized = normalizeDecision({
      kickSafety: 'danger',
      saturationNeed: 'light',
      confidence: 7,
    } as Partial<AIDecision>);

    expect(normalized.kickSafety).toBe('danger');
    expect(normalized.transientHandling).toBe('soften');
    expect(normalized.confidence).toBe(1);
  });
});

describe('reconcileDecisions', () => {
  it('blends model decisions by confidence', () => {
    const gemini: AIDecision = {
      kickSafety: 'safe',
      saturationNeed: 'none',
      transientHandling: 'preserve',
      highFreqTreatment: 'leave',
      stereoIntent: 'monoSafe',
      confidence: 0.9,
    };
    const gpt: AIDecision = {
      kickSafety: 'danger',
      saturationNeed: 'moderate',
      transientHandling: 'control',
      highFreqTreatment: 'restrain',
      stereoIntent: 'wide',
      confidence: 0.1,
    };

    const merged = reconcileDecisions(gemini, gpt);
    expect(merged.kickSafety).toBe('safe');
    expect(merged.saturationNeed).toBe('none');
    expect(merged.confidence).toBeCloseTo(0.5);
  });
});
