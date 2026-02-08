
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
// 1. DSP Helpers (Analog Emulation)
// ==========================================

/** 真空管ドライブ（偶数倍音付加・非対称クリップ） */
const makeTubeCurve = (amount: number): Float32Array => {
  const n = 44100;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let x = (i * 2) / n - 1;
    if (x < -0.5) x = -0.5 + (x + 0.5) * 0.8;
    else if (x > 0.5) x = 0.5 + (x - 0.5) * 0.9;
    curve[i] = Math.tanh(x * amount) / Math.tanh(amount);
  }
  return curve;
};

/** エキサイター（高次倍音生成） */
const makeExciterCurve = (_amount: number): Float32Array => {
  const n = 44100;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = (Math.abs(x) < 0.5)
      ? x
      : (x > 0 ? 0.5 + (x - 0.5) * 0.2 : -0.5 + (x + 0.5) * 0.2);
  }
  return curve;
};

/** ソフトクリッパー（リミッター前段のピーク削り） */
const makeClipperCurve = (threshold: number = 0.95): Float32Array => {
  const n = 65536;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let x = (i * 2) / n - 1;
    if (x > threshold) x = threshold + (x - threshold) * 0.1;
    else if (x < -threshold) x = -threshold + (x + threshold) * 0.1;
    curve[i] = x;
  }
  return curve;
};


// ==========================================
// 2. Shared DSP Chain (Preview & Export)
// ==========================================

/**
 * プロ仕様マスタリングチェーンをオーディオグラフとして構築する共通関数。
 * OfflineAudioContext（書き出し）にも AudioContext（プレビュー）にも使える。
 *
 * 信号経路 (Vocal-First: 整えてから最後に上げる):
 *   Safety Trim (-3dB) → Vocal Guard EQ (2.5kHz -1.5dB) → DC Block
 *   → M/S Tube (Mid 0.5 / Side drive) → Pultec → Corrective EQ → Exciter → M/S
 *   → Glue Comp → Smile Curve → Transient → Neuro-Drive
 *   → Make-up Gain (AI + 3dB) → Clipper (0.98) → Limiter
 */
export const buildMasteringChain = (
  ctx: BaseAudioContext,
  source: AudioNode,
  params: MasteringParams,
  numChannels: number,
  outputNode: AudioNode,
): void => {
  let lastNode: AudioNode = source;

  // =================================================================
  // 1. Safety Input Trim (Vocal-First: 最初は上げず -3dB でヘッドルーム)
  // =================================================================
  const safetyTrim = ctx.createGain();
  safetyTrim.gain.value = 0.7; // -3dB 程度。突発ピークでの割れを防ぐ
  lastNode.connect(safetyTrim);
  lastNode = safetyTrim;

  // =================================================================
  // 2. Vocal Protection EQ (Anti-Harshness)
  // サチュレーションでボーカルが割れるのを防ぐため、
  // 歪みやすい中高域(2.5kHz)を事前に少し抑える。
  // =================================================================
  const vocalGuard = ctx.createBiquadFilter();
  vocalGuard.type = 'peaking';
  vocalGuard.frequency.value = 2500;
  vocalGuard.Q.value = 1.0;
  vocalGuard.gain.value = -1.5;
  lastNode.connect(vocalGuard);
  lastNode = vocalGuard;

  // =================================================================
  // 3. DC Block（ここではゲインを上げない。Make-up は最後に）
  // =================================================================
  const dcBlocker = ctx.createBiquadFilter();
  dcBlocker.type = 'highpass';
  dcBlocker.frequency.value = 20;
  dcBlocker.Q.value = 0.5;
  lastNode.connect(dcBlocker);
  lastNode = dcBlocker;

  // =================================================================
  // 3a. Vocal Safe-Guard Saturation (Stereo only)
  // ボーカル(Mid)を歪ませず、Side(広がり)だけを太くする M/S サチュレーション
  // =================================================================
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
    midShaper.curve = makeTubeCurve(0.5); // Mid (Vocal): 歪み少なめ
    midShaper.oversample = '4x';
    midRaw.connect(midShaper);

    const sideShaper = ctx.createWaveShaper();
    sideShaper.curve = makeTubeCurve(Math.min(params.tube_drive_amount, 4));
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
    // Mono: 従来の薄い Tube Saturation
    const safeDrive = Math.min(params.tube_drive_amount, 1.0);
    const preSatEQ = ctx.createBiquadFilter();
    preSatEQ.type = 'peaking';
    preSatEQ.frequency.value = 1000;
    preSatEQ.Q.value = 1.0;
    preSatEQ.gain.value = -3.0;
    const tubeShaper = ctx.createWaveShaper();
    tubeShaper.curve = makeTubeCurve(safeDrive);
    tubeShaper.oversample = '4x';
    const dry = ctx.createGain();
    dry.gain.value = 1.0;
    const wet = ctx.createGain();
    wet.gain.value = 0.1;
    lastNode.connect(dry);
    lastNode.connect(preSatEQ);
    preSatEQ.connect(tubeShaper);
    tubeShaper.connect(wet);
    const merge = ctx.createGain();
    dry.connect(merge);
    wet.connect(merge);
    lastNode = merge;
  }

  // ── 3b. Resonant Sub Focus (Pultec Trick) ──────────────────────────
  if (params.low_contour_amount > 0) {
    const subFocus = ctx.createBiquadFilter();
    subFocus.type = 'highpass';
    subFocus.frequency.value = 35;
    // Contour 量が多いほど Q を上げてドンシャリ感を出す
    subFocus.Q.value = 0.7 + (params.low_contour_amount * 0.5);
    lastNode.connect(subFocus);
    lastNode = subFocus;
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
    shaper.curve = makeExciterCurve(4.0);
    shaper.oversample = '2x';

    const gain = ctx.createGain();
    gain.gain.value = params.exciter_amount; // 0.0–0.2

    lastNode.connect(hp);
    hp.connect(shaper);
    shaper.connect(gain);
    exciterNode = gain;
  }

  // ── 6. M/S Processing & Width ─────────────────────────────────────
  if (numChannels === 2) {
    const splitter = ctx.createChannelSplitter(2);
    const merger = ctx.createChannelMerger(2);
    lastNode.connect(splitter);

    // M/S Encode: Mid = L+R, Side = L-R
    const midSum = ctx.createGain();
    const sideDiff = ctx.createGain();
    const inv = ctx.createGain();
    inv.gain.value = -1;

    splitter.connect(midSum, 0);
    splitter.connect(midSum, 1);
    splitter.connect(sideDiff, 0);
    splitter.connect(inv, 1);
    inv.connect(sideDiff);

    // Side: Bass Mono (150 Hz 以下をカット) + Width
    const sideHP = ctx.createBiquadFilter();
    sideHP.type = 'highpass';
    sideHP.frequency.value = 150;
    sideHP.Q.value = 0.7;
    sideDiff.connect(sideHP);

    const sideWidth = ctx.createGain();
    sideWidth.gain.value = params.width_amount ?? 1.0;
    sideHP.connect(sideWidth);

    // Mid: Glue Compressor（接着感を出す）— Soft Knee、アタック遅めで声を守る
    const midComp = ctx.createDynamicsCompressor();
    midComp.threshold.value = -12;
    midComp.ratio.value = 2;
    midComp.knee.value = 10;
    midComp.attack.value = 0.05;
    midComp.release.value = 0.1;
    midSum.connect(midComp);

    // M/S Decode: L=(M+S)/2, R=(M-S)/2
    midComp.connect(merger, 0, 0);
    midComp.connect(merger, 0, 1);
    sideWidth.connect(merger, 0, 0);
    const sideInv = ctx.createGain();
    sideInv.gain.value = -1;
    sideWidth.connect(sideInv);
    sideInv.connect(merger, 0, 1);

    const norm = ctx.createGain();
    norm.gain.value = 0.5;
    merger.connect(norm);

    // Exciter をここでマージ
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

  // =================================================================
  // 7. The AI Kapellmeister (Master Bus Orchestration)
  //    バラバラの要素を有機的に結合させる「接着」セクション
  // =================================================================

  // 7a. "Smooth" Glue Compressor
  //     パツパツに潰さず、全体を「包み込む」設定。ボーカルアタックを潰さない。
  const glueComp = ctx.createDynamicsCompressor();
  glueComp.threshold.value = -12;
  glueComp.knee.value = 30;       // かなりソフトニー（自然なかかり方）
  glueComp.ratio.value = 1.5;
  glueComp.attack.value = 0.05;   // 50ms — ボーカルのアタックを潰さない
  glueComp.release.value = 0.4;   // 400ms — ゆっくり戻して余韻を作る
  lastNode.connect(glueComp);
  lastNode = glueComp;

  // 7b. "Smile Curve" — ラウドネス等感度曲線
  //     500Hz 付近の「モコモコ帯域」を -1.5dB 引くことで、
  //     相対的に低域と高域が輝き、マスキングが解消される
  const midScoop = ctx.createBiquadFilter();
  midScoop.type = 'peaking';
  midScoop.frequency.value = 500;
  midScoop.Q.value = 1.0;
  midScoop.gain.value = -1.5;
  lastNode.connect(midScoop);
  lastNode = midScoop;

  // 7c. Transient Recovery (Micro-Dynamics Enhancement)
  //     コンプ/サチュレーションで鈍ったアタック感を取り戻す。
  //     1kHz 以上の高域成分だけを抽出して 15% 加算し、
  //     「太いのにキレがある」状態を作る。
  const transFilter = ctx.createBiquadFilter();
  transFilter.type = 'highpass';
  transFilter.frequency.value = 1000;
  transFilter.Q.value = 0.5;
  lastNode.connect(transFilter);

  const transBoost = ctx.createGain();
  transBoost.gain.value = 0.15; // 原音に 15% のエッジを足す
  transFilter.connect(transBoost);

  const kapellmeisterMerge = ctx.createGain();
  lastNode.connect(kapellmeisterMerge);   // Main body (Smile Curve output)
  transBoost.connect(kapellmeisterMerge);  // Added punch (transient)
  lastNode = kapellmeisterMerge;

  // =================================================================
  // End of Orchestration
  // =================================================================

  // =================================================================
  // 8. THE NEURO-DRIVE MODULE (Scientific Energy Injection)
  //    目的: "Hyper Energy" の生成。音の密度 (RMS) を極限まで高め、
  //    脳をトランス状態へ誘導する「持続的な音圧」を作る。
  //    
  //    原理:
  //    - Parallel Compression (NY Style): ピークはそのまま、減衰音を引き上げ
  //      → 常時音圧がかかり続ける Constant Pressure 状態
  //    - 250Hz High-Pass on Wet: キック/ベースの位相干渉を物理的に回避
  //      → キックはタイトなまま上物だけが分厚くなる
  //    - 12kHz Air Boost: 覚醒中枢を刺激する超高域エネルギー
  //      → ドーパミンが出る「ハイパーな質感」
  // =================================================================

  // 8a. 分岐: 原音 (Dry) はそのまま通過、加工用 (Wet) を並列で作る
  const neuroDryPath = ctx.createGain();
  neuroDryPath.gain.value = 1.0;
  lastNode.connect(neuroDryPath);

  // 8b. Hyper-Compressor (The Energy Generator) — Soft Knee で歪み抑制
  const hyperComp = ctx.createDynamicsCompressor();
  hyperComp.threshold.value = -30;
  hyperComp.ratio.value = 12;
  hyperComp.attack.value = 0.005;
  hyperComp.release.value = 0.25;
  hyperComp.knee.value = 10;        // Soft Knee: 急激な圧縮による歪みを防ぐ
  lastNode.connect(hyperComp);

  // 8c. High-Pass on Wet Signal (800Hz: ボーカル/キック干渉を避ける)
  const energyFilter = ctx.createBiquadFilter();
  energyFilter.type = 'highpass';
  energyFilter.frequency.value = 800;
  energyFilter.Q.value = 0.7;
  hyperComp.connect(energyFilter);

  // 8d. Air Exciter (Electrical Fizz)
  //     12kHz 以上をブーストし、「電気的なビリビリ感」を付加
  const airShelf = ctx.createBiquadFilter();
  airShelf.type = 'highshelf';
  airShelf.frequency.value = 12000;
  airShelf.gain.value = 4.0; // 強烈に輝かせる
  energyFilter.connect(airShelf);

  // 8e. Neuro Injection (Parallel Mixing) — Wet 20% で様子見（歪み抑制）
  const neuroWetGain = ctx.createGain();
  neuroWetGain.gain.value = 0.2;
  airShelf.connect(neuroWetGain);

  const neuroMerge = ctx.createGain();
  neuroDryPath.connect(neuroMerge);
  neuroWetGain.connect(neuroMerge);
  lastNode = neuroMerge;

  // =================================================================
  // End of Neuro-Drive
  // =================================================================

  // =================================================================
  // 9. Intelligent Make-up Gain（ここで音圧を稼ぐ）
  // 全ての処理が終わった後、リミッター直前にブースト。
  // AI のゲイン調整値 + SafetyTrim で下げた分(+3dB)を取り戻す。
  // =================================================================
  const targetGainDb = (params.gain_adjustment_db ?? 0) + 3.0;
  const makeupGain = ctx.createGain();
  makeupGain.gain.value = Math.pow(10, targetGainDb / 20);
  lastNode.connect(makeupGain);
  lastNode = makeupGain;

  // =================================================================
  // 10. Soft Clipper（余裕を持たせる）
  // =================================================================
  const clipper = ctx.createWaveShaper();
  clipper.curve = makeClipperCurve(0.98);
  lastNode.connect(clipper);
  lastNode = clipper;

  // =================================================================
  // 11. Limiter（トランジェント通過のためアタックやや遅め）
  // =================================================================
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = params.limiter_ceiling_db ?? -0.1;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.1;
  lastNode.connect(limiter);
  limiter.connect(outputNode);
};


// ==========================================
// 3. Feedback Loop (Auto-Correction)
// ==========================================

/**
 * AI の提案値を物理的な計測に基づいて補正する。
 * 高速な部分レンダリング（曲の中央 10 秒）を行い、
 * ターゲット LUFS との乖離を埋める。
 *
 * AI = 感性（EQ カーブ、サチュレーション量、ステレオ幅）
 * Code = 物理保証（LUFS、True Peak）
 */
export const optimizeMasteringParams = async (
  originalBuffer: AudioBuffer,
  aiParams: MasteringParams,
): Promise<MasteringParams> => {
  const optimizedParams = { ...aiParams };
  const TARGET_LUFS = aiParams.target_lufs ?? -9.0;

  // 分析用に曲の「サビ」と思われる部分（中央から 10 秒間）を切り出し
  const chunkDuration = 10;
  const startSample = Math.floor(originalBuffer.length / 2);
  const endSample = Math.min(
    startSample + originalBuffer.sampleRate * chunkDuration,
    originalBuffer.length,
  );
  const length = endSample - startSample;

  if (length <= 0) return aiParams;

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

  // --- 簡易 DSP シミュレーション（本番チェーンと同一: Make-up = gain_adjustment_db + 3dB） ---
  const source = offlineCtx.createBufferSource();
  source.buffer = chunkBuffer;
  let node: AudioNode = source;

  const targetGainDb = (optimizedParams.gain_adjustment_db ?? 0) + 3.0;
  const gainNode = offlineCtx.createGain();
  gainNode.gain.value = Math.pow(10, targetGainDb / 20);
  node.connect(gainNode);
  node = gainNode;

  // サチュレーションによる聴感上の音圧上昇を簡易加算
  if (optimizedParams.tube_drive_amount > 0) {
    const satBoost = offlineCtx.createGain();
    satBoost.gain.value = 1.0 + optimizedParams.tube_drive_amount * 0.05;
    node.connect(satBoost);
    node = satBoost;
  }

  // Limiter (Ceiling)
  const limiter = offlineCtx.createDynamicsCompressor();
  limiter.threshold.value = optimizedParams.limiter_ceiling_db - 3;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.003;
  node.connect(limiter);
  limiter.connect(offlineCtx.destination);

  source.start(0);
  const renderedBuffer = await offlineCtx.startRendering();

  // --- RMS から LUFS を簡易推定 ---
  let sumSquare = 0;
  const data = renderedBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) sumSquare += data[i] * data[i];
  const rms = Math.sqrt(sumSquare / data.length);
  const measuredLUFS = 20 * Math.log10(rms) + 0.5; // 簡易補正

  // --- 補正実行 ---
  const diff = TARGET_LUFS - measuredLUFS;
  // 誤差が 0.5 dB 以上あれば補正
  if (Math.abs(diff) > 0.5) {
    let newGain = optimizedParams.gain_adjustment_db + diff;
    // 安全装置: 極端なゲインアップ/ダウンを防ぐ
    newGain = Math.max(-6, Math.min(12, newGain));
    optimizedParams.gain_adjustment_db = parseFloat(newGain.toFixed(1));
    console.log(
      `[Auto-Correction] Adjusted Gain: ${aiParams.gain_adjustment_db} -> ${newGain.toFixed(1)} (Target: ${TARGET_LUFS}, Measured: ${measuredLUFS.toFixed(1)})`,
    );
  }

  return optimizedParams;
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
