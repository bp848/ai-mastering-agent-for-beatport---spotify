import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AudioAnalysisData } from '../types';

const geminiMock = vi.hoisted(() => ({
  getMasteringSuggestionsGemini: vi.fn(),
}));

vi.mock('../services/geminiService', async () => {
  const actual = await vi.importActual<typeof import('../services/geminiService')>('../services/geminiService');
  return {
    ...actual,
    getMasteringSuggestionsGemini: geminiMock.getMasteringSuggestionsGemini,
  };
});

const sampleAnalysis: AudioAnalysisData = {
  lufs: -13,
  truePeak: -1,
  dynamicRange: 10,
  crestFactor: 11,
  stereoWidth: 50,
  peakRMS: -16,
  bassVolume: -12,
  phaseCorrelation: 0.8,
  distortionPercent: 0.1,
  noiseFloorDb: -80,
  frequencyData: [
    { name: '20-60', level: -15 },
    { name: '60-250', level: -11 },
    { name: '250-1k', level: -9 },
    { name: '1k-4k', level: -8 },
    { name: '4k-8k', level: -10 },
    { name: '8k-20k', level: -12 },
  ],
  waveform: [],
};

describe('aiService.getMasteringSuggestions', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.ENABLE_AI_MASTERING;
    delete process.env.GEMINI_API_KEY;
  });

  it('returns deterministic params when AI mastering is disabled', async () => {
    const svc = await import('../services/aiService');
    const result = await svc.getMasteringSuggestions(sampleAnalysis, 'spotify', 'ja');

    expect(geminiMock.getMasteringSuggestionsGemini).not.toHaveBeenCalled();
    expect(result.params.gain_adjustment_db).toBe(0);
    expect(result.params.eq_adjustments).toEqual([]);
    expect(result.rawResponseText).toContain('deterministic');
  });

  it('throws no-key error when AI mastering is enabled without key', async () => {
    process.env.ENABLE_AI_MASTERING = 'true';
    const svc = await import('../services/aiService');

    await expect(svc.getMasteringSuggestions(sampleAnalysis, 'beatport', 'en')).rejects.toThrow('error.gemini.no_key');
  });

  it('calls gemini path when AI mastering is enabled with key', async () => {
    process.env.ENABLE_AI_MASTERING = 'true';
    process.env.GEMINI_API_KEY = 'dummy';
    geminiMock.getMasteringSuggestionsGemini.mockResolvedValue({
      params: {
        gain_adjustment_db: 1,
        limiter_ceiling_db: -1,
        eq_adjustments: [],
        tube_drive_amount: 0,
        exciter_amount: 0,
        low_contour_amount: 0,
        width_amount: 1,
      },
      rawResponseText: '{}',
    });

    const svc = await import('../services/aiService');
    const result = await svc.getMasteringSuggestions(sampleAnalysis, 'spotify', 'ja');

    expect(geminiMock.getMasteringSuggestionsGemini).toHaveBeenCalledOnce();
    expect(result.params.gain_adjustment_db).toBe(1);
  });

  it('falls back to deterministic params when gemini path fails', async () => {
    process.env.ENABLE_AI_MASTERING = 'true';
    process.env.GEMINI_API_KEY = 'dummy';
    geminiMock.getMasteringSuggestionsGemini.mockRejectedValue(new Error('fail'));

    const svc = await import('../services/aiService');
    const result = await svc.getMasteringSuggestions(sampleAnalysis, 'spotify', 'ja');

    expect(result.params.gain_adjustment_db).toBe(0);
    expect(result.rawResponseText).toContain('deterministic');
  });
});
