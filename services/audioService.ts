
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
  const d = Math.max(0, Math.min(1, drive * 0.25));
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

  const dcBlocker = ctx.createBiquadFilter();
  dcBlocker.type = 'highpass';
  dcBlocker.frequency.value = 20;
  dcBlocker.Q.value = 0.5;
  lastNode.connect(dcBlocker);
  lastNode = dcBlocker;

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
    sideShaper.curve = asCurve(makeTubeCurve(Math.min(params.tube_drive_amount, 4)));
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
    tubeShaper.curve = asCurve(makeTubeCurve(Math.min(params.tube_drive_amount, 4)));
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
    hp.frequency.value = 6000;
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
  hyperComp.attack.value = 0.02;
  hyperComp.release.value = 0.25;
  lastNode.connect(hyperComp);

  const energyFilter = ctx.createBiquadFilter();
  energyFilter.type = 'highpass';
  energyFilter.frequency.value = 300;
  energyFilter.Q.value = 0.5;
  hyperComp.connect(energyFilter);

  const airShelf = ctx.createBiquadFilter();
  airShelf.type = 'highshelf';
  airShelf.frequency.value = 10000;
  airShelf.gain.value = 1.0;
  energyFilter.connect(airShelf);

  const neuroWetGain = ctx.createGain();
  neuroWetGain.gain.value = 0.14;
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

  // [4] Soft Clipper → Limiter（ここでコード側の固定ゲインは入れない。AI のゲインをそのまま使う） — 閾値手前から tanh で丸め、リミッターは Attack 極短でトランジェント潰しを最小化。
  const limiterCeilingDb = params.limiter_ceiling_db ?? -0.3;
  const clipperThreshold = Math.max(0.92, Math.min(0.99, dbToLinear(limiterCeilingDb - 0.3)));
  const clipper = ctx.createWaveShaper();
  clipper.curve = asCurve(makeClipperCurve(clipperThreshold));
  clipper.oversample = '4x';
  lastNode.connect(clipper);
  lastNode = clipper;

  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = limiterCeilingDb;
  limiter.knee.value = 0;
  // WebAudio の DynamicsCompressor は「完全なブリックウォール」ではないため、
  // 比率とアタックを強めてピークの突き抜けを抑える
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.12;
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
  // target_lufs が渡らない場合は「安全側」に倒す（過大ゲインで割れないため）
  const TARGET_LUFS = aiParams.target_lufs ?? -14.0;
  // ceiling は -0.3 dB に統一（過激な ceiling 指示を封じる）
  const TARGET_TRUE_PEAK_DB = Math.min(aiParams.limiter_ceiling_db ?? -1.0, -0.3);

  // 分析用に曲の「サビ」と思われる部分（中央から 10 秒間）を切り出し
  const chunkDuration = 10;
  const startSample = Math.floor(originalBuffer.length / 2);
  const endSample = Math.min(
    startSample + originalBuffer.sampleRate * chunkDuration,
    originalBuffer.length,
  );
  const length = endSample - startSample;

  if (length <= 0) return { params: aiParams, measuredLufs: -60, measuredPeakDb: -100 };

  const offlineCtx = new OfflineAudioContext(
    originalBuffer.numberOfChannels,
    length,
    originalBuffer.sampleRate,
  );
  const chunkBuffer = offlineCtx.createBuffer(
    originalBuffer.numberOfChannels,
    length,
    originalBuffer.sampleRate,
  );

  for (let ch = 0; ch < originalBuffer.numberOfChannels; ch++) {
    const raw = originalBuffer.getChannelData(ch);
    const chunk = chunkBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) chunk[i] = raw[startSample + i];
  }

  // [1] Self-Correction Loop — 本番と同一チェーンでレンダリングし、目標 LUFS との誤差を 0.1 dB 単位で補正する。
  const source = offlineCtx.createBufferSource();
  source.buffer = chunkBuffer;
  buildMasteringChain(
    offlineCtx,
    source,
    optimizedParams,
    originalBuffer.numberOfChannels,
    offlineCtx.destination,
  );

  source.start(0);
  const renderedBuffer = await offlineCtx.startRendering();

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

  // --- 補正: 数字は AI が渡す params を優先。未指定時のみフォールバック（目標 LUFS に届くようにする） ---
  const LUFS_THRESHOLD = aiParams.self_correction_lufs_tolerance_db ?? 0.5;
  // 1回の補正で動かしすぎると歪みやすいので控えめに
  const MAX_GAIN_STEP_DB = aiParams.self_correction_max_gain_step_db ?? 3;
  const MAX_SELF_CORRECTION_BOOST_DB = aiParams.self_correction_max_boost_db ?? 6;
  // クリップしている場合はより強く引けるようにする
  const MAX_PEAK_CUT_STEP_DB = aiParams.self_correction_max_peak_cut_db ?? 6;
  const GAIN_CAP_DB = 6;
  const GAIN_FLOOR_DB = -12;
  const GAIN_RESOLUTION = 20;

  const diff = TARGET_LUFS - measuredLUFS;
  let newGain = optimizedParams.gain_adjustment_db;

  if (Math.abs(diff) > LUFS_THRESHOLD) {
    const step = Math.sign(diff) * Math.min(Math.abs(diff), MAX_GAIN_STEP_DB);
    newGain += step;
    if (diff > 0) {
      newGain = Math.min(newGain, aiParams.gain_adjustment_db + MAX_SELF_CORRECTION_BOOST_DB);
    }
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
  newGain = Math.max(GAIN_FLOOR_DB, Math.min(GAIN_CAP_DB, newGain));
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
// Export (WAV 書き出し)
// ------------------------------------------------------------------

export const applyMasteringAndExport = async (
  originalBuffer: AudioBuffer,
  params: MasteringParams,
): Promise<Blob> => {
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
  const renderedBuffer = await offlineCtx.startRendering();
  return bufferToWave(renderedBuffer);
};
