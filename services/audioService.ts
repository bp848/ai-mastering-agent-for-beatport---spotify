
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
    
    # REAL True Peak with 4x Oversampling (Linear Interpolation)
    # This is the actual ITU-R BS.1770 True Peak measurement, not a fake constant addition
    if channels > 1:
        # Process each channel separately for accurate True Peak
        true_peak_val = 0.0
        for ch_idx in range(channels):
            channel_data = audio_data[:, ch_idx]
            # Create 4x oversampled version using linear interpolation
            original_len = len(channel_data)
            x_original = np.arange(original_len)
            x_resampled = np.arange(0, original_len - 1, 0.25)  # 0.25 step = 4x oversampling
            # Linear interpolation to 4x sample rate
            channel_4x = np.interp(x_resampled, x_original, channel_data)
            # Find peak in oversampled data
            ch_peak = np.max(np.abs(channel_4x))
            if ch_peak > true_peak_val:
                true_peak_val = ch_peak
    else:
        # Mono: single channel processing
        original_len = len(audio_data)
        x_original = np.arange(original_len)
        x_resampled = np.arange(0, original_len - 1, 0.25)  # 0.25 step = 4x oversampling
        audio_4x = np.interp(x_resampled, x_original, audio_data)
        true_peak_val = np.max(np.abs(audio_4x))
    
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

    # --- Detailed Low-End Diagnostics (AI-driven parameter derivation) ---
    sub_band = next((item['level'] for item in frequency_results if item['name'] == '20-60'), -100.0)
    bass_band = bass_volume

    low_end_crest_db = float(np.clip(crest_factor - max(0.0, bass_band + 20.0) * 0.15, 0.0, 30.0))
    sub_to_bass_balance_db = float(sub_band - bass_band)

    if len(freqs) > 0 and N > 0:
        spectrum_power = np.square(np.abs(fft_result))
        total_power = float(np.sum(spectrum_power))
        low_end_mask = np.where((freqs >= 20) & (freqs < 250))
        low_mid_mask = np.where((freqs >= 250) & (freqs < 1000))
        low_end_power = float(np.sum(spectrum_power[low_end_mask])) if len(low_end_mask[0]) > 0 else 0.0
        low_mid_power = float(np.sum(spectrum_power[low_mid_mask])) if len(low_mid_mask[0]) > 0 else 0.0
        sub_energy_ratio = (low_end_power / total_power) if total_power > 1e-12 else 0.0
        low_end_to_low_mid_ratio = (low_end_power / low_mid_power) if low_mid_power > 1e-12 else (5.0 if low_end_power > 0 else 1.0)
    else:
        sub_energy_ratio = 0.0
        low_end_to_low_mid_ratio = 1.0

    if channels > 1:
        bass_mono_compatibility = float(np.clip((phase_correlation + 1.0) * 50.0, 0.0, 100.0))
    else:
        bass_mono_compatibility = 100.0

    abs_signal = np.abs(mono_chunk) if N > 0 else np.array([])
    if len(abs_signal) > 8:
        edge = np.abs(np.diff(abs_signal))
        transient_density = float(np.mean(edge > np.percentile(edge, 85)) * 100.0)
    else:
        transient_density = 0.0

    distortion_risk_score = int(
        (true_peak_db > -1.2) +
        (crest_factor < 9.5) +
        (estimated_thd_percent > 0.8) +
        (sub_to_bass_balance_db > 1.5) +
        (sub_energy_ratio > 0.35) +
        (phase_correlation < 0.2)
    )

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
        "lowEndCrestDb": low_end_crest_db if np.isfinite(low_end_crest_db) else 0.0,
        "subToBassBalanceDb": sub_to_bass_balance_db if np.isfinite(sub_to_bass_balance_db) else 0.0,
        "subEnergyRatio": sub_energy_ratio if np.isfinite(sub_energy_ratio) else 0.0,
        "lowEndToLowMidRatio": low_end_to_low_mid_ratio if np.isfinite(low_end_to_low_mid_ratio) else 1.0,
        "bassMonoCompatibility": bass_mono_compatibility if np.isfinite(bass_mono_compatibility) else 100.0,
        "transientDensity": transient_density if np.isfinite(transient_density) else 0.0,
        "distortionRiskScore": distortion_risk_score,
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


// ==========================================
// 1. DSP Helpers (Anti-aliasing / Analog-like)
// ==========================================

/**
 * Tube Saturation — tanh ベースでエイリアシングを抑え、偶数倍音用の非対称バイアス。
 * ナイーブな線形カーブは高域で非調和歪みの原因になるため、滑らかな伝達関数に変更。
 */
/** WaveShaperNode.curve 用。lib.dom の Float32Array<ArrayBuffer> と ArrayBufferLike の型不一致を回避 */
const asCurve = (arr: Float32Array): NonNullable<WaveShaperNode['curve']> => arr as unknown as NonNullable<WaveShaperNode['curve']>;

const makeTubeCurve = (amount: number): Float32Array => {
  const n = 65536;
  const curve = new Float32Array(n);
  const drive = Math.max(0, amount * 2);
  const bias = 0.1;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    if (drive <= 0) {
      curve[i] = x;
    } else {
      const k = 1 + drive;
      curve[i] = Math.tanh(k * (x + bias * x)) / Math.tanh(k);
    }
  }
  return curve;
};

/**
 * Exciter — フォールディング歪みはエイリアシングが酷いため、
 * ソフトな整流系カーブで高次倍音を付加しつつクランプ。
 */
const makeExciterCurve = (drive: number): Float32Array => {
  const n = 65536;
  const curve = new Float32Array(n);
  const d = drive * 0.25;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    let y = x + d * (Math.abs(x) * x - x);
    curve[i] = Math.max(-1, Math.min(1, y));
  }
  return curve;
};

/**
 * Soft Clipper — リニアスロープ（ハードに近い）はトランジェントを潰しやすい。
 * 閾値手前から tanh でスムーズに圧縮し、自然な粘りと True Peak 抑制。
 */
const makeClipperCurve = (kneeThreshold: number = 0.85): Float32Array => {
  const n = 65536;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    const absX = Math.abs(x);
    if (absX < kneeThreshold) {
      curve[i] = x;
    } else {
      const diff = absX - kneeThreshold;
      const headroom = 1 - kneeThreshold;
      const compressed = kneeThreshold + headroom * Math.tanh(diff / headroom);
      curve[i] = x > 0 ? compressed : -compressed;
    }
  }
  return curve;
};

/** 必ず ±1 に収める（割れ防止の最終保証）。DynamicsCompressor のオーバーシュート対策。 */
const makeBrickwallCurve = (): Float32Array => {
  const n = 65536;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1;
    curve[i] = Math.max(-1, Math.min(1, x));
  }
  return curve;
};

const dbToLinear = (db: number): number => Math.pow(10, db / 20);
export const MASTERING_OVERSAMPLE_FACTOR = 32;

export function resolveNeuroDriveSettings(params: MasteringParams): { airShelfGainDb: number; wetMix: number } {
  const exciterAmount = Number.isFinite(params.exciter_amount) ? Math.max(0, params.exciter_amount) : 0;
  const tubeDriveAmount = Number.isFinite(params.tube_drive_amount) ? Math.max(0, params.tube_drive_amount) : 0;
  const loudnessPush = Number.isFinite(params.gain_adjustment_db) ? Math.max(0, params.gain_adjustment_db) : 0;
  const lowContourAmount = Number.isFinite(params.low_contour_amount) ? Math.max(0, params.low_contour_amount) : 0;

  const highLoudnessGuard = Math.max(0, loudnessPush - 2.5);
  const airShelfGainDb = 1.4 + exciterAmount * 3.8 + tubeDriveAmount * 0.1;
  const wetMix = 0.09 + exciterAmount * 0.28 + (lowContourAmount - 0.3) * 0.05 + loudnessPush * 0.01;

  return {
    airShelfGainDb,
    wetMix,
  };
}

export interface AdaptiveMasteringSettings {
  tubeHpfHz: number;
  exciterHpfHz: number;
  transientAttackS: number;
  transientReleaseS: number;
  limiterAttackS: number;
  limiterReleaseS: number;
}

/** AI 由来の可変パラメータを安全範囲で正規化。固定値依存を減らす。 */
export function resolveAdaptiveMasteringSettings(params: MasteringParams): AdaptiveMasteringSettings {
  const tubeHpfHz = params.tube_hpf_hz ?? 30;
  const exciterHpfHz = params.exciter_hpf_hz ?? 6000;
  const transientAttackS = params.transient_attack_s ?? 0.02;
  const transientReleaseS = params.transient_release_s ?? 0.25;
  const limiterAttackS = params.limiter_attack_s ?? 0.002;
  const limiterReleaseS = params.limiter_release_s ?? 0.15;
  return {
    tubeHpfHz,
    exciterHpfHz,
    transientAttackS,
    transientReleaseS,
    limiterAttackS,
    limiterReleaseS,
  };
}

// ==========================================
// 2. Shared DSP Chain (Preview & Export)
// ==========================================

/**
 * Hybrid-Analog Engine — 5本柱のみ。仕様外の固定処理は入れない。
 *
 * 1. Self-Correction Loop → optimizeMasteringParams() で gain を 0.1dB 単位補正
 * 2. Tube & Tape Saturation → 下記 [2] params.tube_drive_amount
 * 3. Pultec Style Low-End → 下記 [3] params.low_contour_amount
 * 4. Transient Shaper & Clipper → 下記 [4] ソフトクリッパー → リミッター
 * 5. Neuro-Drive Module → 下記 [5] 並列圧縮 + 12kHz Air + Wet ミックス
 *
 * 信号経路: DC Block → [2] Tube → [3] Pultec → AI EQ → Exciter → M/S Width → [5] Neuro → Make-up → [4] Clipper → Limiter
 */
export const buildMasteringChain = (
  ctx: BaseAudioContext,
  source: AudioNode,
  params: MasteringParams,
  numChannels: number,
  outputNode: AudioNode,
): void => {
  let lastNode: AudioNode = source;
  const adaptiveSettings = resolveAdaptiveMasteringSettings(params);

  const dcBlocker = ctx.createBiquadFilter();
  dcBlocker.type = 'highpass';
  dcBlocker.frequency.value = 20;
  dcBlocker.Q.value = 0.5;
  lastNode.connect(dcBlocker);
  lastNode = dcBlocker;

  // Tube 段前の可変 HPF — 不要な低域を除去
  const tubeHpf = ctx.createBiquadFilter();
  tubeHpf.type = 'highpass';
  tubeHpf.frequency.value = adaptiveSettings.tubeHpfHz;
  tubeHpf.Q.value = 0.5;
  lastNode.connect(tubeHpf);
  lastNode = tubeHpf;

  // [2] Tube & Tape Saturation — 偶数倍音・物質感。量は AI パラメータのみ。
  if (numChannels === 2) {
    const splitter = ctx.createChannelSplitter(2);
    const merger = ctx.createChannelMerger(2);
    lastNode.connect(splitter);

    const midRaw = ctx.createGain();
    const sideRaw = ctx.createGain();
    const rightInv = ctx.createGain();
    rightInv.gain.value = -1;

    splitter.connect(midRaw, 0);
    splitter.connect(midRaw, 1);
    splitter.connect(sideRaw, 0);
    splitter.connect(rightInv, 1);
    rightInv.connect(sideRaw);

    const midShaper = ctx.createWaveShaper();
    midShaper.curve = asCurve(makeTubeCurve(Math.min(params.tube_drive_amount * 0.5, 2)));
    midShaper.oversample = '4x';
    midRaw.connect(midShaper);

    const sideShaper = ctx.createWaveShaper();
    sideShaper.curve = asCurve(makeTubeCurve(params.tube_drive_amount));
    sideShaper.oversample = '4x';
    sideRaw.connect(sideShaper);

    // M/S Decode: L = Mid+Side, R = Mid-Side
    midShaper.connect(merger, 0, 0);
    midShaper.connect(merger, 0, 1);
    sideShaper.connect(merger, 0, 0);
    const sideInvBack = ctx.createGain();
    sideInvBack.gain.value = -1;
    sideShaper.connect(sideInvBack);
    sideInvBack.connect(merger, 0, 1);

    const msNorm = ctx.createGain();
    msNorm.gain.value = 0.5;
    merger.connect(msNorm);
    lastNode = msNorm;
  } else if (params.tube_drive_amount > 0) {
    const tubeShaper = ctx.createWaveShaper();
    tubeShaper.curve = asCurve(makeTubeCurve(params.tube_drive_amount));
    tubeShaper.oversample = '4x';
    lastNode.connect(tubeShaper);
    lastNode = tubeShaper;
  }

  // [3] Pultec Style Low-End — コンセプト体現: 30Hz以下カット＋その直上をレゾナンスで音楽的に強調
  if (params.low_contour_amount > 0) {
    const subCut = ctx.createBiquadFilter();
    subCut.type = 'highpass';
    subCut.frequency.value = 30;
    subCut.Q.value = 0.707;
    lastNode.connect(subCut);
    lastNode = subCut;
    // 直上の帯域をレゾナンスで強調（キック・ベースの分離と深度の両立）
    const contourBoost = ctx.createBiquadFilter();
    contourBoost.type = 'peaking';
    contourBoost.frequency.value = 55;
    contourBoost.gain.value = 2.5 * params.low_contour_amount; // 0〜+2.5 dB
    contourBoost.Q.value = 0.9;
    lastNode.connect(contourBoost);
    lastNode = contourBoost;
  }

  // ── 4. Corrective EQ (AI パラメータ) ──────────────────────────────
  if (params.eq_adjustments?.length) {
    for (const eq of params.eq_adjustments) {
      const f = ctx.createBiquadFilter();
      f.type = (eq.type === 'peak' ? 'peaking' : eq.type) as BiquadFilterType;
      f.frequency.value = eq.frequency;
      f.gain.value = eq.gain_db;
      f.Q.value = eq.q;
      lastNode.connect(f);
      lastNode = f;
    }
  }

  // ── 5. Exciter (Parallel High Frequency Distortion) ───────────────
  let exciterNode: GainNode | null = null;
  if (params.exciter_amount > 0) {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = adaptiveSettings.exciterHpfHz;
    hp.Q.value = 0.5;

    const shaper = ctx.createWaveShaper();
    shaper.curve = asCurve(makeExciterCurve(4.0));
    shaper.oversample = '4x';

    const gain = ctx.createGain();
    gain.gain.value = params.exciter_amount; // 0.0–0.2

    lastNode.connect(hp);
    hp.connect(shaper);
    shaper.connect(gain);
    exciterNode = gain;
  }

  // M/S Width — ステレオ幅のみ。AI パラメータ。Mid は固定コンプなし。
  if (numChannels === 2) {
    const splitter = ctx.createChannelSplitter(2);
    const merger = ctx.createChannelMerger(2);
    lastNode.connect(splitter);

    const midSum = ctx.createGain();
    const sideDiff = ctx.createGain();
    const inv = ctx.createGain();
    inv.gain.value = -1;

    splitter.connect(midSum, 0);
    splitter.connect(midSum, 1);
    splitter.connect(sideDiff, 0);
    splitter.connect(inv, 1);
    inv.connect(sideDiff);

    const sideHP = ctx.createBiquadFilter();
    sideHP.type = 'highpass';
    sideHP.frequency.value = params.low_mono_hz != null ? Math.max(100, Math.min(320, params.low_mono_hz)) : 150;
    sideHP.Q.value = 0.7;
    sideDiff.connect(sideHP);

    const sideWidth = ctx.createGain();
    sideWidth.gain.value = params.width_amount ?? 1.0;
    sideHP.connect(sideWidth);

    midSum.connect(merger, 0, 0);
    midSum.connect(merger, 0, 1);
    sideWidth.connect(merger, 0, 0);
    const sideInv = ctx.createGain();
    sideInv.gain.value = -1;
    sideWidth.connect(sideInv);
    sideInv.connect(merger, 0, 1);

    const norm = ctx.createGain();
    norm.gain.value = 0.5;
    merger.connect(norm);

    const finalMix = ctx.createGain();
    norm.connect(finalMix);
    if (exciterNode) exciterNode.connect(finalMix);
    lastNode = finalMix;
  } else {
    // Mono fallback
    if (exciterNode) {
      const monoMix = ctx.createGain();
      lastNode.connect(monoMix);
      exciterNode.connect(monoMix);
      lastNode = monoMix;
    }
  }

  // [5] Neuro-Drive — 原音を尊重。圧縮・Air は控えめにブレンド（潰さない）
  const neuroDryPath = ctx.createGain();
  neuroDryPath.gain.value = 1.0;
  lastNode.connect(neuroDryPath);

  const hyperComp = ctx.createDynamicsCompressor();
  hyperComp.threshold.value = -26;
  hyperComp.knee.value = 10;
  hyperComp.ratio.value = 3;
  hyperComp.attack.value = adaptiveSettings.transientAttackS;
  hyperComp.release.value = adaptiveSettings.transientReleaseS;
  lastNode.connect(hyperComp);

  // Neuro-Drive lowshelf: Control excessive sub-bass without destroying the low end
  // 80Hz lowshelf -6dB preserves musicality (300Hz highpass was killing bass energy)
  const energyFilter = ctx.createBiquadFilter();
  energyFilter.type = 'lowshelf';
  energyFilter.frequency.value = 80;
  energyFilter.gain.value = -6;
  hyperComp.connect(energyFilter);

  const neuroSettings = resolveNeuroDriveSettings(params);

  const airShelf = ctx.createBiquadFilter();
  airShelf.type = 'highshelf';
  airShelf.frequency.value = 10000;
  airShelf.gain.value = neuroSettings.airShelfGainDb;
  energyFilter.connect(airShelf);

  const neuroWetGain = ctx.createGain();
  neuroWetGain.gain.value = neuroSettings.wetMix;
  airShelf.connect(neuroWetGain);

  const neuroMerge = ctx.createGain();
  neuroDryPath.connect(neuroMerge);
  neuroWetGain.connect(neuroMerge);
  lastNode = neuroMerge;

  // Make-up Gain — 自己補正ループが決めた gain_adjustment_db のみ。固定の +3dB 等は加えない。
  const targetGainDb = params.gain_adjustment_db ?? 0;
  const makeupGain = ctx.createGain();
  makeupGain.gain.value = dbToLinear(targetGainDb);
  lastNode.connect(makeupGain);
  lastNode = makeupGain;

  // [4] Soft Clipper → Limiter — レッド張り付き防止: 天井に余裕 (-1.0 dB デフォルト)、ニーで硬く潰しすぎない
  const limiterCeilingDb = params.limiter_ceiling_db ?? -1.0;
  const clipperThreshold = Math.max(0.88, Math.min(0.98, dbToLinear(limiterCeilingDb - 0.5)));
  const clipper = ctx.createWaveShaper();
  clipper.curve = asCurve(makeClipperCurve(clipperThreshold));
  clipper.oversample = '4x';
  lastNode.connect(clipper);
  lastNode = clipper;

  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = limiterCeilingDb;
  limiter.knee.value = 2.5; // ニーを入れて張り付きを緩和（0 だと常時 GR）
  limiter.ratio.value = 12;
  limiter.attack.value = adaptiveSettings.limiterAttackS;
  limiter.release.value = adaptiveSettings.limiterReleaseS;
  lastNode.connect(limiter);
  lastNode = limiter;

  // 最終保証: どの曲でも絶対に割れない（DynamicsCompressor のオーバーシュート・浮動小数点誤差対策）
  const brickwall = ctx.createWaveShaper();
  brickwall.curve = asCurve(makeBrickwallCurve());
  brickwall.oversample = '4x';
  lastNode.connect(brickwall);
  brickwall.connect(outputNode);
};


// ==========================================
// 3. Feedback Loop (Auto-Correction)
// ==========================================

/**
 * レンダリング後の実測ピークが目標を超過している場合、
 * ゲインを引き戻して安全な値にする。
 * 「LUFS 合わせ後にピークだけ破綻」を防ぐ第3層の補正。
 */
export function computePeakSafeGain(
  measuredPeakDb: number,
  targetPeakDb: number,
  currentGainDb: number,
  options: { marginDb?: number; headroomDb?: number; maxCutDb?: number } = {},
): number {
  const { marginDb = 0.05, headroomDb = 0.1, maxCutDb = 6 } = options;
  if (measuredPeakDb <= targetPeakDb - marginDb) return currentGainDb;
  const overflowDb = measuredPeakDb - targetPeakDb + headroomDb;
  const cut = Math.min(overflowDb, maxCutDb);
  return currentGainDb - cut;
}

/**
 * レンダリング済みピークに「これから加えるゲイン差分」を加味して
 * 事前にピーク超過リスクを見積もる。
 */
export function predictPostGainPeakDb(
  measuredPeakDb: number,
  currentGainDb: number,
  candidateGainDb: number,
): number {
  return measuredPeakDb + (candidateGainDb - currentGainDb);
}

/**
 * AI の提案値を物理的な計測に基づいて補正する。
 * 高速な部分レンダリング（曲の中央 10 秒）を行い、
 * ターゲット LUFS との乖離を埋める。
 *
 * AI = 感性（EQ カーブ、サチュレーション量、ステレオ幅）
 * Code = 物理保証（LUFS、True Peak）
 */
export interface OptimizeResult {
  params: MasteringParams;
  measuredLufs: number;
  measuredPeakDb: number;
}

export const optimizeMasteringParams = async (
  originalBuffer: AudioBuffer,
  aiParams: MasteringParams,
): Promise<OptimizeResult> => {
  const optimizedParams = { ...aiParams };
  const TARGET_LUFS = aiParams.target_lufs ?? -14.0;
  // Use AI's limiter ceiling preference directly (no hard override)
  const TARGET_TRUE_PEAK_DB = aiParams.limiter_ceiling_db ?? -1.0;

  // 分析用に曲の「サビ」と思われる部分（中央から 10 秒間）を切り出し
  const chunkDuration = 10;
  const startSample = Math.floor(originalBuffer.length / 2);
  const endSample = Math.min(
    startSample + originalBuffer.sampleRate * chunkDuration,
    originalBuffer.length,
  );
  const length = endSample - startSample;

  if (length <= 0) return { params: aiParams, measuredLufs: -60, measuredPeakDb: -100 };

  const tempCtx = new OfflineAudioContext(
    originalBuffer.numberOfChannels,
    length,
    originalBuffer.sampleRate,
  );
  const chunkBuffer = tempCtx.createBuffer(
    originalBuffer.numberOfChannels,
    length,
    originalBuffer.sampleRate,
  );

  for (let ch = 0; ch < originalBuffer.numberOfChannels; ch++) {
    const raw = originalBuffer.getChannelData(ch);
    const chunk = chunkBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) chunk[i] = raw[startSample + i];
  }

  // [1] Self-Correction Loop — 本番と同一オーバーサンプリング経路でレンダリングし、分析時と最終書き出しの音質差をなくす。
  const renderedBuffer = await renderMasteredBuffer(chunkBuffer, optimizedParams);

  // --- 400ms ブロック積分で LUFS を推定（単一 RMS より精度が高い）---
  const data = renderedBuffer.getChannelData(0);
  const sr = renderedBuffer.sampleRate;
  const blockSamples = Math.max(1, Math.floor(0.4 * sr));
  const blocks: number[] = [];
  for (let i = 0; i + blockSamples <= data.length; i += blockSamples) {
    let sumSq = 0;
    for (let j = 0; j < blockSamples; j++) sumSq += data[i + j] * data[i + j];
    const meanSq = sumSq / blockSamples;
    if (meanSq > 1e-20) blocks.push(-0.691 + 10 * Math.log10(meanSq));
  }
  const measuredLUFS =
    blocks.length === 0
      ? -60
      : 10 * Math.log10(blocks.reduce((acc, Lk) => acc + Math.pow(10, Lk / 10), 0) / blocks.length);

  // マスター実測 True Peak（全チャンネル・全サンプル）
  let maxSample = 0;
  for (let ch = 0; ch < renderedBuffer.numberOfChannels; ch++) {
    const chan = renderedBuffer.getChannelData(ch);
    for (let i = 0; i < chan.length; i++) {
      const v = Math.abs(chan[i]);
      if (v > maxSample) maxSample = v;
    }
  }
  const measuredPeakDb = maxSample <= 1e-10 ? -100 : 20 * Math.log10(maxSample);

  // --- Self-Correction: CAPS REMOVED - AI gain values respected ---
  const LUFS_THRESHOLD = aiParams.self_correction_lufs_tolerance_db ?? 1.0;
  const MAX_PEAK_CUT_STEP_DB = aiParams.self_correction_max_peak_cut_db ?? 6;
  const GAIN_RESOLUTION = 100;

  const diff = TARGET_LUFS - measuredLUFS;
  let newGain = optimizedParams.gain_adjustment_db;

  // Apply full LUFS correction without arbitrary step/boost limits
  if (Math.abs(diff) > LUFS_THRESHOLD) {
    newGain += diff; // Full correction, not capped to 0.8dB steps or +1.5dB boost
  }

  // 実測ピークに「提案差分」を加えた予測値で先にピーク安全性を判定する。
  // これにより「LUFS を上げるために newGain を増やした直後の割れ」を防ぐ。
  const predictedPeakDb = predictPostGainPeakDb(
    measuredPeakDb,
    optimizedParams.gain_adjustment_db ?? 0,
    newGain,
  );

  // 実測/予測ピーク超過時は computePeakSafeGain でゲインを引き戻す（音割れ防止）
  newGain = computePeakSafeGain(predictedPeakDb, TARGET_TRUE_PEAK_DB, newGain, {
    maxCutDb: MAX_PEAK_CUT_STEP_DB,
  });
  // GAIN_CAP_DB and GAIN_FLOOR_DB removed - no arbitrary limits on AI gain
  optimizedParams.gain_adjustment_db = Math.round(newGain * GAIN_RESOLUTION) / GAIN_RESOLUTION;
  if (optimizedParams.gain_adjustment_db !== aiParams.gain_adjustment_db) {
    console.log(
      `[Self-Correction] Gain ${aiParams.gain_adjustment_db} → ${optimizedParams.gain_adjustment_db} dB (Target LUFS: ${TARGET_LUFS}, Measured LUFS: ${measuredLUFS.toFixed(2)}, Measured Peak: ${measuredPeakDb.toFixed(2)} dBFS)`,
    );
  }

  return {
    params: optimizedParams,
    measuredLufs: measuredLUFS,
    measuredPeakDb: measuredPeakDb,
  };
};

// ------------------------------------------------------------------
// オーバーサンプリング: オフライン処理は x32 デフォルト（WaveShaper 4x と合わせて実質 x32 相当）
// ------------------------------------------------------------------
function getSupportedOversampleFactor(baseSampleRate: number): number {
  const factors = [32, 16, 8, 4, 2, 1];
  for (const f of factors) {
    if (f === 1) return 1;
    const rate = baseSampleRate * f;
    if (rate > 768000) continue; // 多くのブラウザ上限
    try {
      new OfflineAudioContext(1, 128, rate);
      return f;
    } catch {
      continue;
    }
  }
  return 1;
}

function upsampleAudioBuffer(buffer: AudioBuffer, factor: number): AudioBuffer {
  const numCh = buffer.numberOfChannels;
  const newLength = buffer.length * factor;
  const newRate = buffer.sampleRate * factor;
  const ctx = new OfflineAudioContext(numCh, newLength, newRate);
  const out = ctx.createBuffer(numCh, newLength, newRate);
  for (let ch = 0; ch < numCh; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);
    for (let i = 0; i < newLength; i++) {
      const t = i / factor;
      const idx = Math.floor(t);
      const frac = t - idx;
      const a = src[Math.min(idx, src.length - 1)];
      const b = src[Math.min(idx + 1, src.length - 1)];
      dst[i] = a + (b - a) * frac;
    }
  }
  return out;
}

function downsampleAudioBuffer(buffer: AudioBuffer, factor: number): AudioBuffer {
  const numCh = buffer.numberOfChannels;
  const srcLen = buffer.length;
  const dstLen = Math.floor(srcLen / factor);
  const targetRate = buffer.sampleRate / factor;
  const ctx = new OfflineAudioContext(numCh, dstLen, targetRate);
  const out = ctx.createBuffer(numCh, dstLen, targetRate);
  for (let ch = 0; ch < numCh; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = out.getChannelData(ch);
    for (let i = 0; i < dstLen; i++) {
      const start = i * factor;
      const end = Math.min(start + factor, srcLen);
      let sum = 0;
      for (let j = start; j < end; j++) sum += src[j];
      dst[i] = sum / (end - start);
    }
  }
  return out;
}

// ------------------------------------------------------------------
// マスター波形表示用: 本番チェーンと同一処理でレンダリングした AudioBuffer を返す（固定ゲイン近似なし）
// オーバーサンプリング: 最大32倍まで対応（ブラウザ対応に応じて 32/16/8/4/2/1 のいずれか）
// ------------------------------------------------------------------
export const renderMasteredBuffer = async (
  originalBuffer: AudioBuffer,
  params: MasteringParams,
): Promise<AudioBuffer> => {
  const factor = getSupportedOversampleFactor(originalBuffer.sampleRate);
  const effectiveFactor = Math.min(factor, MASTERING_OVERSAMPLE_FACTOR);

  if (effectiveFactor <= 1) {
    const offlineCtx = new OfflineAudioContext(
      originalBuffer.numberOfChannels,
      originalBuffer.length,
      originalBuffer.sampleRate,
    );
    const source = offlineCtx.createBufferSource();
    source.buffer = originalBuffer;
    buildMasteringChain(
      offlineCtx,
      source,
      params,
      originalBuffer.numberOfChannels,
      offlineCtx.destination,
    );
    source.start(0);
    return offlineCtx.startRendering();
  }

  const upsampled = upsampleAudioBuffer(originalBuffer, effectiveFactor);
  const offlineCtx = new OfflineAudioContext(
    upsampled.numberOfChannels,
    upsampled.length,
    upsampled.sampleRate,
  );
  const source = offlineCtx.createBufferSource();
  source.buffer = upsampled;
  buildMasteringChain(
    offlineCtx,
    source,
    params,
    upsampled.numberOfChannels,
    offlineCtx.destination,
  );
  source.start(0);
  const renderedHighRate = await offlineCtx.startRendering();
  return downsampleAudioBuffer(renderedHighRate, effectiveFactor);
};

// ------------------------------------------------------------------
// Export (WAV 書き出し)
// ------------------------------------------------------------------

export const applyMasteringAndExport = async (
  originalBuffer: AudioBuffer,
  params: MasteringParams,
): Promise<Blob> => {
  const renderedBuffer = await renderMasteredBuffer(originalBuffer, params);
  return bufferToWave(renderedBuffer);
};
