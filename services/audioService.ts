
import type { AudioAnalysisData, MasteringParams } from '../types';

// Helper function to convert AudioBuffer to a WAV file (Blob)
const bufferToWave = (buffer: AudioBuffer): Blob => {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  const channels: Float32Array[] = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };

  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  // Write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  // Write "fmt " chunk
  setUint32(0x20746d66); // "fmt "
  setUint32(16); // chunk size
  setUint16(1); // PCM
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // byte rate
  setUint16(numOfChan * 2); // block align
  setUint16(16); // bits per sample

  // Write "data" chunk
  setUint32(0x61746164); // "data"
  setUint32(length - pos - 4); // chunk size

  // Write interleaved PCM data
  for (i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([view], { type: 'audio/wav' });
};

const analysisScript = `
import numpy as np
import json
import pyloudnorm as pyln

def analyze_audio(left_channel_proxy, right_channel_proxy, sample_rate, channels):
    # Convert JS proxies to Python memoryviews/buffers, then to numpy arrays
    left_channel = np.array(left_channel_proxy.to_py())
    
    if channels > 1:
        right_channel = np.array(right_channel_proxy.to_py())
        # pyloudnorm expects shape (samples, channels)
        audio_data = np.stack([left_channel, right_channel], axis=1)
    else:
        audio_data = left_channel

    # --- LUFS (EBU R 128) and True Peak ---
    meter = pyln.Meter(sample_rate, block_size=0.400) # Use standard block size
    lufs = meter.integrated_loudness(audio_data)
    
    # A simple peak of the original data is a good approximation for TP.
    # A true TP meter requires oversampling, which is too slow for this context.
    true_peak_val = np.max(np.abs(audio_data))
    true_peak_db = 20 * np.log10(true_peak_val) if true_peak_val > 0 else -144.0

    # --- RMS, Dynamic Range, Crest Factor ---
    rms_val = np.sqrt(np.mean(np.square(audio_data)))
    peak_rms_db = 20 * np.log10(rms_val) if rms_val > 0 else -144.0
    dynamic_range = true_peak_db - peak_rms_db
    crest_factor = dynamic_range

    # --- Stereo Width & Phase Correlation ---
    stereo_width = 0.0
    phase_correlation = 1.0
    if channels > 1:
        mid = (left_channel + right_channel) * 0.5
        side = (left_channel - right_channel) * 0.5
        mid_rms = np.sqrt(np.mean(np.square(mid)))
        side_rms = np.sqrt(np.mean(np.square(side)))
        if mid_rms > 1e-9:
            stereo_width = np.clip((side_rms / mid_rms) * 150, 0, 100)
        # Phase correlation: -1 (out of phase) to +1 (in phase)
        correlation = np.corrcoef(left_channel, right_channel)[0, 1]
        phase_correlation = float(correlation) if not np.isnan(correlation) else 1.0
    
    # --- Distortion (THD approximation via harmonic detection) ---
    # Check for clipping/saturation: samples near ±1.0 indicate potential distortion
    clipped_samples = np.sum(np.abs(audio_data) > 0.98)
    total_samples = audio_data.size
    clipping_ratio = clipped_samples / total_samples if total_samples > 0 else 0.0
    # Estimate THD-like metric: if many samples are clipped, distortion is likely
    estimated_thd_percent = clipping_ratio * 100.0
    
    # --- Noise Floor (silence detection) ---
    # Find quiet sections (below -60dB) and measure their RMS
    quiet_threshold = 10 ** (-60 / 20)  # -60dB in linear
    quiet_mask = np.abs(audio_data) < quiet_threshold
    if np.any(quiet_mask):
        quiet_samples = audio_data[quiet_mask]
        noise_rms = np.sqrt(np.mean(np.square(quiet_samples)))
        noise_floor_db = 20 * np.log10(noise_rms) if noise_rms > 0 else -144.0
    else:
        noise_floor_db = -100.0  # No quiet sections found

    # --- Frequency Analysis ---
    # Analyze a chunk from the middle for performance
    start = len(left_channel) // 4
    end = start + 8192
    if len(left_channel) < 8192:
        start = 0
        end = len(left_channel)
        
    mono_chunk = left_channel[start:end] if channels == 1 else ((left_channel[start:end] + right_channel[start:end]) / 2)
    
    N = len(mono_chunk)
    if N > 0:
        fft_result = np.fft.rfft(mono_chunk)
        freqs = np.fft.rfftfreq(N, 1.0/sample_rate)
        magnitudes_db = 20 * np.log10(np.abs(fft_result) / N)
    else:
        magnitudes_db = np.array([])
        freqs = np.array([])
    
    bands = {
        '20-60': (20, 60), '60-250': (60, 250), '250-1k': (250, 1000),
        '1k-4k': (1000, 4000), '4k-8k': (4000, 8000), '8k-20k': (8000, 20000),
    }
    
    frequency_results = []
    for name, (fmin, fmax) in bands.items():
        if len(freqs) > 0:
            indices = np.where((freqs >= fmin) & (freqs < fmax))
            avg_level = np.mean(magnitudes_db[indices]) if len(indices[0]) > 0 else -100.0
        else:
            avg_level = -100.0
        frequency_results.append({"name": name, "level": float(avg_level)})
    
    bass_volume = next((item['level'] for item in frequency_results if item['name'] == '60-250'), -100.0)

    results = {
        "lufs": lufs if np.isfinite(lufs) else -144.0,
        "truePeak": true_peak_db if np.isfinite(true_peak_db) else -144.0,
        "dynamicRange": dynamic_range if np.isfinite(dynamic_range) and dynamic_range > 0 else 0.0,
        "crestFactor": crest_factor if np.isfinite(crest_factor) and crest_factor > 0 else 0.0,
        "stereoWidth": stereo_width if np.isfinite(stereo_width) else 0.0,
        "peakRMS": peak_rms_db if np.isfinite(peak_rms_db) else -144.0,
        "bassVolume": bass_volume if np.isfinite(bass_volume) else -100.0,
        "frequencyData": frequency_results,
        "phaseCorrelation": phase_correlation if channels > 1 else 1.0,
        "distortionPercent": estimated_thd_percent,
        "noiseFloorDb": noise_floor_db if np.isfinite(noise_floor_db) else -100.0,
    }

    return json.dumps(results)
`;

export const analyzeAudioFile = async (file: File): Promise<{ analysisData: AudioAnalysisData; audioBuffer: AudioBuffer }> => {
    // Fixed: Use (window as any) to access the pyodide instance initialized in App.tsx
    const pyodide = (window as any).pyodide;
    if (!pyodide) {
        throw new Error("error.pyodide.not_ready");
    }

    try {
        await pyodide.runPythonAsync(analysisScript);
        const analyze_audio_func = pyodide.globals.get('analyze_audio');

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const channels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;

        // Pass TypedArrays directly to Python. Pyodide sees them as JsProxies.
        const leftChannel = audioBuffer.getChannelData(0);
        const rightChannel = channels > 1 ? audioBuffer.getChannelData(1) : null;

        const jsonResult = analyze_audio_func(leftChannel, rightChannel, sampleRate, channels);
        const rawAnalysisData = JSON.parse(jsonResult);
        
        // --- Waveform generation (can still be done in JS for performance) ---
        const waveformPoints = 120;
        let waveformSourceData: Float32Array;

        // Create a mono mixdown for accurate waveform representation in stereo files
        if (audioBuffer.numberOfChannels > 1) {
            const left = audioBuffer.getChannelData(0);
            const right = audioBuffer.getChannelData(1);
            waveformSourceData = new Float32Array(left.length);
            for (let i = 0; i < left.length; i++) {
                waveformSourceData[i] = (left[i] + right[i]) / 2;
            }
        } else {
            waveformSourceData = audioBuffer.getChannelData(0);
        }
        
        const length = waveformSourceData.length;
        const chunkSize = Math.floor(length / waveformPoints);
        const waveform: number[] = [];
        if (chunkSize > 0) {
            for (let i = 0; i < waveformPoints; i++) {
                const start = i * chunkSize;
                const end = start + chunkSize;
                let max = 0;
                for (let j = start; j < end; j++) {
                    const val = Math.abs(waveformSourceData[j]);
                    if (val > max) max = val;
                }
                waveform.push(max);
            }
        }

        const analysisData: AudioAnalysisData = {
            ...rawAnalysisData,
            waveform,
        };

        // Clean up
        analyze_audio_func.destroy();

        return { analysisData, audioBuffer };

    } catch (e) {
        console.error("Python audio analysis failed:", e);
        throw new Error("error.pyodide.analysis_failed");
    }
};


export const applyMasteringAndExport = async (originalBuffer: AudioBuffer, params: MasteringParams): Promise<Blob> => {
  const offlineCtx = new OfflineAudioContext(
    originalBuffer.numberOfChannels,
    originalBuffer.length,
    originalBuffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = originalBuffer;

  let lastNode: AudioNode = source;

  // 1. Gain Adjustment
  const gainNode = offlineCtx.createGain();
  gainNode.gain.value = Math.pow(10, (params.gain_adjustment_db ?? 0) / 20);
  lastNode.connect(gainNode);
  lastNode = gainNode;

  // 2. EQ Adjustments
  if (params.eq_adjustments && params.eq_adjustments.length > 0) {
    for (const eq of params.eq_adjustments) {
      const filterNode = offlineCtx.createBiquadFilter();
      const filterType = (eq.type === 'peak' ? 'peaking' : eq.type) as BiquadFilterType;
      filterNode.type = filterType;
      filterNode.frequency.value = eq.frequency;
      filterNode.gain.value = eq.gain_db;
      filterNode.Q.value = eq.q;
      lastNode.connect(filterNode);
      lastNode = filterNode;
    }
  }

  // 3. Limiter（シーリングは「上限」であり、threshold は「ここから圧縮開始」にすること）
  // threshold をシーリングより下に置き、ピークだけを抑えてダイナミクスを保持する
  const ceilingDb = params.limiter_ceiling_db ?? -0.1;
  const limiter = offlineCtx.createDynamicsCompressor();
  limiter.threshold.value = ceilingDb - 6; // シーリングの 6dB 下から圧縮 → ピークのみリミット
  limiter.knee.value = 6;                  // ソフトニーでとげとげしさを軽減
  limiter.ratio.value = 8;                // 20:1 だと潰れやすいので 8:1 に
  limiter.attack.value = 0.003;           // わずかに遅めでトランジェントを残す
  limiter.release.value = 0.08;           // リリースをやや長めで自然に

  lastNode.connect(limiter);
  limiter.connect(offlineCtx.destination);

  source.start(0);

  const renderedBuffer = await offlineCtx.startRendering();
  return bufferToWave(renderedBuffer);
};
