import type { AIDecision, AudioAnalysisData, MasteringTarget } from '../types';

export const getPlatformSpecifics = (target: MasteringTarget) => {
  if (target === 'spotify') {
    return {
      platformName: 'Spotify',
      genreContext: 'Streaming distribution focused on translation and consistency.',
    };
  }
  return {
    platformName: 'Beatport Top (Techno/Trance chart-competitive standard)',
    genreContext: 'Club-oriented distribution focused on impact, clarity, and consistency.',
  };
};

export type PlatformSpecifics = ReturnType<typeof getPlatformSpecifics>;

const toSnapshot = (data: AudioAnalysisData): string => {
  const valueFor = (name: string): number => data.frequencyData.find((f) => f.name === name)?.level ?? data.bassVolume;
  return [
    `integratedLoudness=${data.lufs.toFixed(6)}`,
    `truePeak=${data.truePeak.toFixed(6)}`,
    `crestFactor=${data.crestFactor.toFixed(6)}`,
    `dynamicRange=${data.dynamicRange.toFixed(6)}`,
    `stereoWidth=${data.stereoWidth.toFixed(6)}`,
    `phaseCorrelation=${data.phaseCorrelation.toFixed(6)}`,
    `distortionPercent=${data.distortionPercent.toFixed(6)}`,
    `subBass=${valueFor('20-60').toFixed(6)}`,
    `bass=${valueFor('60-250').toFixed(6)}`,
    `lowMid=${valueFor('250-1k').toFixed(6)}`,
    `mid=${valueFor('1k-4k').toFixed(6)}`,
    `highMid=${valueFor('4k-8k').toFixed(6)}`,
    `high=${valueFor('8k-20k').toFixed(6)}`,
  ].join('\n');
};

const decisionContract = `Return ONLY valid JSON with this exact shape:
{
  "kickSafety": "safe" | "borderline" | "danger",
  "saturationNeed": "none" | "light" | "moderate",
  "transientHandling": "preserve" | "soften" | "control",
  "highFreqTreatment": "leave" | "polish" | "restrain",
  "stereoIntent": "monoSafe" | "balanced" | "wide",
  "confidence": number between 0 and 1
}
Do not output dB, Hz, or ms.`;

export const generateGeminiInitialPrompt = (data: AudioAnalysisData, specifics: PlatformSpecifics): string => `
You are the structural analyzer for mastering decisions.
Focus on tonal balance, dynamic distribution, and platform suitability.
Platform: ${specifics.platformName}
Context: ${specifics.genreContext}

Analysis:
${toSnapshot(data)}

${decisionContract}
`.trim();

export const generateGptReviewPrompt = (
  data: AudioAnalysisData,
  specifics: PlatformSpecifics,
  geminiDecision: AIDecision,
): string => `
You are the perceptual reviewer for mastering decisions.
Review Gemini's decision, challenge weak assumptions, and propose corrected intent if needed.
Platform: ${specifics.platformName}
Context: ${specifics.genreContext}

Analysis:
${toSnapshot(data)}

Gemini decision:
${JSON.stringify(geminiDecision)}

${decisionContract}
`.trim();

export const generateConsensusPrompt = (
  specifics: PlatformSpecifics,
  geminiDecision: AIDecision,
  gptDecision: AIDecision,
): string => `
Resolve disagreements between two AI assessments and output final decision only.
Platform: ${specifics.platformName}
Context: ${specifics.genreContext}

Gemini decision:
${JSON.stringify(geminiDecision)}

GPT decision:
${JSON.stringify(gptDecision)}

${decisionContract}
`.trim();
