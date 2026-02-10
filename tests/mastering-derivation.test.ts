import { describe, it, expect } from 'vitest';
import { deriveMasteringParamsFromDecision } from '../services/masteringDerivation';
import {
  generateConsensusPrompt,
  generateGeminiInitialPrompt,
  generateGptReviewPrompt,
  getPlatformSpecifics,
} from '../services/masteringPrompts';
import type { AIDecision, AudioAnalysisData } from '../types';

const analysis: AudioAnalysisData = {
  lufs: -10,
  truePeak: -0.2,
  dynamicRange: 8,
  crestFactor: 7,
  stereoWidth: 55,
  peakRMS: -12,
  bassVolume: -9,
  phaseCorrelation: 0.7,
  distortionPercent: 2,
  noiseFloorDb: -80,
  waveform: [],
  frequencyData: [
    { name: '20-60', level: -12 },
    { name: '60-250', level: -10 },
    { name: '250-1k', level: -8 },
    { name: '1k-4k', level: -7 },
    { name: '4k-8k', level: -6 },
    { name: '8k-20k', level: -5 },
  ],
};

const decision: AIDecision = {
  kickSafety: 'danger',
  saturationNeed: 'moderate',
  transientHandling: 'control',
  highFreqTreatment: 'polish',
  stereoIntent: 'wide',
  confidence: 0.7,
};

describe('deriveMasteringParamsFromDecision', () => {
  it('derives all DSP values from analysis+decision and outputs finite params', () => {
    const params = deriveMasteringParamsFromDecision(decision, analysis);
    expect(Number.isFinite(params.gain_adjustment_db)).toBe(true);
    expect(Number.isFinite(params.limiter_ceiling_db)).toBe(true);
    expect(Number.isFinite(params.tube_drive_amount)).toBe(true);
    expect(Number.isFinite(params.exciter_amount)).toBe(true);
    expect(Number.isFinite(params.tube_hpf_hz as number)).toBe(true);
    expect(Number.isFinite(params.exciter_hpf_hz as number)).toBe(true);
    expect(params.eq_adjustments.length).toBeGreaterThan(0);
  });

  it('changes derived result when decision changes', () => {
    const wide = deriveMasteringParamsFromDecision(decision, analysis);
    const narrow = deriveMasteringParamsFromDecision(
      { ...decision, stereoIntent: 'monoSafe', highFreqTreatment: 'restrain' },
      analysis,
    );
    expect(wide.width_amount).not.toBe(narrow.width_amount);
    expect(wide.exciter_amount).not.toBe(narrow.exciter_amount);
  });
});

describe('mastering prompts', () => {
  it('requests qualitative decision categories for Gemini', () => {
    const prompt = generateGeminiInitialPrompt(analysis, getPlatformSpecifics('spotify'));
    expect(prompt).toContain('"kickSafety": "safe" | "borderline" | "danger"');
    expect(prompt).toContain('Do not output dB, Hz, or ms.');
  });

  it('includes review and consensus context payloads', () => {
    const specifics = getPlatformSpecifics('beatport');
    const review = generateGptReviewPrompt(analysis, specifics, decision);
    const consensus = generateConsensusPrompt(specifics, decision, { ...decision, confidence: 0.3 });
    expect(review).toContain('Gemini decision');
    expect(consensus).toContain('GPT decision');
  });
});
