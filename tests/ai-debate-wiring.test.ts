import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AudioAnalysisData } from '../types';

const generateGeminiInitialPrompt = vi.fn(() => 'INITIAL_PROMPT');
const generateGptReviewPrompt = vi.fn(() => 'REVIEW_PROMPT');
const generateConsensusPrompt = vi.fn(() => 'CONSENSUS_PROMPT');

vi.mock('../services/masteringPrompts', () => ({
  getPlatformSpecifics: vi.fn(() => ({
    platformName: 'Beatport Top (Techno/Trance chart-competitive standard)',
    targetLufs: -8,
    targetPeak: -0.3,
    genreContext: 'club safe',
  })),
  generateGeminiInitialPrompt,
  generateGptReviewPrompt,
  generateConsensusPrompt,
}));

const generateContent = vi.fn(async () => ({ text: '{"kickSafety":"safe","saturationNeed":"light","transientHandling":"preserve","highFreqTreatment":"polish","stereoIntent":"balanced","confidence":0.9}' }));
class GoogleGenAIMock {
  models = { generateContent };
}
vi.mock('@google/genai', () => ({
  GoogleGenAI: GoogleGenAIMock,
}));

describe('aiDebateService wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses generateGeminiInitialPrompt output inside resolveMasteringDecision', async () => {
    const { resolveMasteringDecision } = await import('../services/aiDebateService');

    const analysis: AudioAnalysisData = {
      lufs: -11,
      truePeak: -0.8,
      dynamicRange: 8,
      crestFactor: 9,
      stereoWidth: 70,
      peakRMS: -10,
      bassVolume: -12,
      phaseCorrelation: 0.3,
      distortionPercent: 0.4,
      noiseFloorDb: -90,
      waveform: [],
      frequencyData: [
        { name: '20-60', level: -12 },
        { name: '60-250', level: -11 },
        { name: '250-1k', level: -24 },
        { name: '1k-4k', level: -30 },
        { name: '4k-8k', level: -34 },
        { name: '8k-20k', level: -40 },
      ],
    };

    const out = await resolveMasteringDecision(analysis, 'beatport', 'ja');

    expect(generateGeminiInitialPrompt).toHaveBeenCalledTimes(1);
    expect(generateGeminiInitialPrompt).toHaveBeenCalledWith(
      analysis,
      expect.objectContaining({ targetLufs: -8 }),
    );
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({ contents: 'INITIAL_PROMPT' }),
    );
    expect(out.rawResponseText).toContain('"kickSafety":"safe"');
    expect(generateGptReviewPrompt).not.toHaveBeenCalled();
    expect(generateConsensusPrompt).not.toHaveBeenCalled();
  });
});
