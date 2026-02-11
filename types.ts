
export interface FrequencyData {
  name: string;
  level: number;
}

export interface AudioAnalysisData {
  lufs: number;
  truePeak: number;
  dynamicRange: number;
  crestFactor: number;
  stereoWidth: number;
  peakRMS: number;
  bassVolume: number;
  phaseCorrelation: number;    // -1 to +1 (位相相関)
  distortionPercent: number;   // THD近似（クリッピング率）
  noiseFloorDb: number;        // ノイズフロア（-dB）
  frequencyData: FrequencyData[];
  waveform: number[];
}

export type MasteringTarget = 'beatport' | 'spotify';

/** AI 議論レイヤーの出力。数値は一切返さず、意図・相対評価のみ。 */
export interface AIDecision {
  kickSafety: 'safe' | 'borderline' | 'danger';
  saturationNeed: 'none' | 'light' | 'moderate';
  transientHandling: 'preserve' | 'soften' | 'control';
  highFreqTreatment: 'leave' | 'polish' | 'restrain';
  stereoIntent: 'monoSafe' | 'balanced' | 'wide';
  confidence: number; // 0.0–1.0
}

export type MetricStatus = 'good' | 'warning' | 'bad' | 'neutral';

export interface EQAdjustment {
  frequency: number;
  gain_db: number;
  q: number;
  type: 'peak' | 'lowshelf' | 'highshelf' | 'lowpass' | 'highpass';
}

export interface MasteringParams {
  // --- 基本パラメータ ---
  gain_adjustment_db: number;
  eq_adjustments: EQAdjustment[];
  limiter_ceiling_db: number;

  // --- Signature Engine Parameters (AI が決定する「色気」) ---
  tube_drive_amount: number;      // 0.0–5.0  真空管サチュレーション量
  exciter_amount: number;         // 0.0–0.2  高域倍音付加量
  low_contour_amount: number;     // 0.0–1.0  Pultec式 低域処理量
  width_amount: number;           // 1.0–1.5  ステレオ幅

  // --- Target Logic (アルゴリズムが強制する目標値) ---
  target_lufs?: number;           // 目標音圧 (例: -8.0 LUFS)

  // --- Self-Correction (フィードバックループ用。未指定時はフォールバック) ---
  self_correction_lufs_tolerance_db?: number;
  self_correction_max_gain_step_db?: number;
  self_correction_max_boost_db?: number;
  self_correction_max_peak_cut_db?: number;

  // --- 導出パラメータ（分析＋AIDecision から算出。未指定時は DSP 内フォールバック） ---
  tube_hpf_hz?: number;
  exciter_hpf_hz?: number;
  transient_attack_s?: number;
  transient_release_s?: number;
  limiter_attack_s?: number;
  limiter_release_s?: number;
}

// --- 楽曲管理プラットフォーム ---

export type PlatformSection = 'mastering' | 'pricing' | 'mypage' | 'library' | 'checklist' | 'email' | 'sns' | 'admin';

/** ダウンロード・購入履歴（Supabase） */
export interface DownloadHistoryRow {
  id: string;
  user_id: string;
  file_name: string;
  mastering_target: MasteringTarget;
  created_at: string;
  amount_cents?: number | null; // 決済連携時に使用
}

/** ライブラリの1曲（メタ情報・マスター状態） */
export interface LibraryTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  isrc: string;
  releaseDate: string;
  artworkUrl: string; // データURL or 空
  fileName: string;
  masteringTarget: MasteringTarget | null;
  createdAt: string; // ISO
}

/** プレイリスト入りチェック（グラウンディング） */
export interface PlaylistCheckItem {
  id: string;
  trackId: string;
  platform: 'spotify' | 'beatport' | 'apple' | 'other';
  playlistName: string;
  checked: boolean;
  checkedAt: string | null; // ISO
}

/** メールマーケティング用コンタクト */
export interface EmailContact {
  id: string;
  email: string;
  name: string;
  addedAt: string; // ISO
}

// --- 楽曲管理プラットフォーム用 ---
export interface LibraryTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  isrc: string;
  releaseDate: string;
  artworkUrl: string;
  notes: string;
  createdAt: string;
}

export type PlaylistPlatform = 'spotify' | 'beatport' | 'apple' | 'other';

export interface PlaylistCheckItem {
  id: string;
  trackId: string;
  platform: PlaylistPlatform;
  playlistName: string;
  checked: boolean;
  checkedAt: string | null;
}

export interface EmailContact {
  id: string;
  email: string;
  name: string;
  addedAt: string;
}
