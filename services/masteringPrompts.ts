import type { AudioAnalysisData, MasteringTarget } from '../types';

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

export const generateMasteringPrompt = (
  data: AudioAnalysisData,
  specifics: PlatformSpecifics
): string => {
  const subBass = data.frequencyData.find(f => f.name === '20-60')?.level ?? data.bassVolume;
  const bass = data.frequencyData.find(f => f.name === '60-250')?.level ?? data.bassVolume;
  const lowMid = data.frequencyData.find(f => f.name === '250-1k')?.level ?? data.bassVolume;
  const mid = data.frequencyData.find(f => f.name === '1k-4k')?.level ?? data.bassVolume;
  const highMid = data.frequencyData.find(f => f.name === '4k-8k')?.level ?? data.bassVolume;
  const high = data.frequencyData.find(f => f.name === '8k-20k')?.level ?? data.bassVolume;

  return `
# ROLE
You are a mastering analysis assistant for ${specifics.platformName}.
Make only qualitative judgments from analysis data.

# CONTEXT
${specifics.genreContext}

# ANALYSIS SNAPSHOT
- integratedLoudness: ${data.lufs.toFixed(2)}
- truePeak: ${data.truePeak.toFixed(2)}
- crestFactor: ${data.crestFactor.toFixed(2)}
- dynamicRange: ${data.dynamicRange.toFixed(2)}
- stereoWidth: ${data.stereoWidth.toFixed(2)}
- phaseCorrelation: ${data.phaseCorrelation.toFixed(2)}
- distortionPercent: ${data.distortionPercent.toFixed(3)}
- subBass: ${subBass.toFixed(2)}
- bass: ${bass.toFixed(2)}
- lowMid: ${lowMid.toFixed(2)}
- mid: ${mid.toFixed(2)}
- highMid: ${highMid.toFixed(2)}
- high: ${high.toFixed(2)}

# OUTPUT CONTRACT
Return ONLY valid JSON with this exact shape:
{
  "kickRisk": "low" | "mid" | "high",
  "transientRisk": "low" | "mid" | "high",
  "bassDensity": "thin" | "normal" | "thick",
  "highHarshness": "none" | "some" | "strong",
  "stereoNeed": "narrow" | "normal" | "wide"
}

Do not return numeric values.
Do not include units.
Do not include prose.
`.trim();
};
