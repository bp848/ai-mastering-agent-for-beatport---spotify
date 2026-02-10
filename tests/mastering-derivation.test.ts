import { describe, it, expect } from 'vitest';
import { deriveMasteringParamsFromIntent } from '../services/masteringDerivation';
import { generateMasteringPrompt, getPlatformSpecifics } from '../services/masteringPrompts';
import type { AudioAnalysisData, MasteringIntent } from '../types';

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

const intent: MasteringIntent = {
  kickRisk: 'high',
  transientRisk: 'mid',
  bassDensity: 'thick',
  highHarshness: 'some',
  stereoNeed: 'wide',
};

describe('deriveMasteringParamsFromIntent', () => {
  it('derives all DSP values from analysis+intent and outputs finite params', () => {
    const params = deriveMasteringParamsFromIntent(intent, analysis);
    expect(Number.isFinite(params.gain_adjustment_db)).toBe(true);
    expect(Number.isFinite(params.limiter_ceiling_db)).toBe(true);
    expect(Number.isFinite(params.tube_drive_amount)).toBe(true);
    expect(Number.isFinite(params.exciter_amount)).toBe(true);
    expect(Number.isFinite(params.tube_hpf_hz as number)).toBe(true);
    expect(Number.isFinite(params.exciter_hpf_hz as number)).toBe(true);
    expect(params.eq_adjustments.length).toBeGreaterThan(0);
  });

  it('changes derived result when intent changes', () => {
    const wide = deriveMasteringParamsFromIntent(intent, analysis);
    const narrow = deriveMasteringParamsFromIntent({ ...intent, stereoNeed: 'narrow', highHarshness: 'strong' }, analysis);
    expect(wide.width_amount).not.toBe(narrow.width_amount);
    expect(wide.exciter_amount).not.toBe(narrow.exciter_amount);
  });
});

describe('generateMasteringPrompt', () => {
  it('requests qualitative JSON categories and disallows numeric return instructions', () => {
    const prompt = generateMasteringPrompt(analysis, getPlatformSpecifics('spotify'));
    expect(prompt).toContain('"kickRisk": "low" | "mid" | "high"');
    expect(prompt).toContain('Do not return numeric values.');
    expect(prompt).not.toContain('Hz');
    expect(prompt).not.toContain('ms');
  });
});
