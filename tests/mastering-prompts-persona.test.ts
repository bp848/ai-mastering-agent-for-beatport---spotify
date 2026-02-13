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
    expect(prompt).toContain('ハイレンジの抜けと覚醒感');
    expect(prompt).toContain('ミッドハイのマット加工');
    expect(prompt).toContain('スーパーベースのパワフルでエレクトニックなうねり');
  });

  it('keeps reviewer prompt aligned to the same personas and safety stance', () => {
    const prompt = generateGptReviewPrompt(sampleAnalysis, getPlatformSpecifics('beatport'), '{"kickSafety":"danger"}');
    expect(prompt).toContain('top DJ who takes the crowd into a trance state');
    expect(prompt).toContain('Beatport Top 10 regular track-maker mastering engineer');
    expect(prompt).toContain('If low-end safety is uncertain, choose the safer intent');
    expect(prompt).toContain('super-bass electronic undulation without noise/distortion');
  });

  it('enforces persona framing in consensus stage', () => {
    const prompt = generateConsensusPrompt('{"a":1}', '{"b":2}');
    expect(prompt).toContain('top DJ who leads the crowd into trance + Beatport Top 10 mastering engineer');
    expect(prompt).toContain('high-range openness and awakening sparkle');
    expect(prompt).toContain('super-bass electronic undulation');
  });


  it('adds two-AI micro-correction guidance for sub-dB adjustments in mastering prompt', () => {
    const specifics = getPlatformSpecifics('beatport');
    const prompt = generateMasteringPrompt(sampleAnalysis, specifics);
    expect(prompt).toContain('two-AI consensus pass (Gemini + OpenAI');
    expect(prompt).toContain('tiny per-track adjustments under 1 dB');
    expect(prompt).toContain('reduce gain by about 0.1–0.4 dB');
    expect(prompt).toContain('Keep impact and forward energy');
  });

});
