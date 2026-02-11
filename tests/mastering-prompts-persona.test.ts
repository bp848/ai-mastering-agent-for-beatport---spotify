import { describe, expect, it } from 'vitest';
import type { AudioAnalysisData } from '../types';
import { generateConsensusPrompt, generateGeminiInitialPrompt, generateGptReviewPrompt, generateMasteringPrompt, getPlatformSpecifics } from '../services/masteringPrompts';

const sampleAnalysis: AudioAnalysisData = {
  lufs: -10,
  truePeak: -0.7,
  dynamicRange: 9,
  crestFactor: 8.5,
  stereoWidth: 80,
  peakRMS: -9,
  bassVolume: -11,
  phaseCorrelation: 0.12,
  distortionPercent: 1.2,
  noiseFloorDb: -85,
  waveform: [],
  frequencyData: [
    { name: '20-60', level: -12 },
    { name: '60-250', level: -11 },
    { name: '250-1k', level: -24 },
    { name: '1k-4k', level: -26 },
    { name: '4k-8k', level: -30 },
    { name: '8k-20k', level: -38 },
  ],
};

describe('mastering prompt persona policy', () => {
  it('injects top DJ and Beatport Top 10 engineer personas into initial prompt', () => {
    const prompt = generateGeminiInitialPrompt(sampleAnalysis, getPlatformSpecifics('beatport'));
    expect(prompt).toContain('top DJ whose job is to take the audience into a trance state');
    expect(prompt).toContain('Beatport Top 10 regular track-maker mastering engineer');
    expect(prompt).toContain('crackle-free kick/bass impact');
  });

  it('keeps reviewer prompt aligned to the same personas and safety stance', () => {
    const prompt = generateGptReviewPrompt(sampleAnalysis, getPlatformSpecifics('beatport'), '{"kickSafety":"danger"}');
    expect(prompt).toContain('top DJ who takes the crowd into a trance state');
    expect(prompt).toContain('Beatport Top 10 regular track-maker mastering engineer');
    expect(prompt).toContain('If low-end safety is uncertain, choose the safer intent');
  });

  it('enforces persona framing in consensus stage', () => {
    const prompt = generateConsensusPrompt('{"a":1}', '{"b":2}');
    expect(prompt).toContain('top DJ who leads the crowd into trance + Beatport Top 10 mastering engineer');
    expect(prompt).toContain('bass that never crackles when volume is turned up');
  });


  it('includes Beatport technical low-end and TP guidance in mastering prompt', () => {
    const prompt = generateMasteringPrompt(sampleAnalysis, getPlatformSpecifics('beatport'));
    expect(prompt).toContain('For Beatport masters: enforce TP at -1.0 dBTP');
    expect(prompt).toContain('tight punchy kick (48–55 Hz)');
    expect(prompt).toContain('mono low-end lock below 120 Hz');
    expect(prompt).toContain('crisp airy percussion (+2 dB around 8–10 kHz maximum)');
    expect(prompt).toContain('INTEGRATED LUFS: -9');
  });
});
