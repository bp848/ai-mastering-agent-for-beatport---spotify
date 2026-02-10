
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

export type MetricStatus = 'good' | 'warning' | 'bad' | 'neutral';

export interface EQAdjustment {
  frequency: number;
  gain_db: number;
  q: number;
  type: 'peak' | 'lowshelf' | 'highshelf' | 'lowpass' | 'highpass';
}

export interface AIDecision {
  kickSafety: 'safe' | 'borderline' | 'danger';
  saturationNeed: 'none' | 'light' | 'moderate';
  transientHandling: 'preserve' | 'soften' | 'control';
  highFreqTreatment: 'leave' | 'polish' | 'restrain';
  stereoIntent: 'monoSafe' | 'balanced' | 'wide';
  confidence: number;
}

export interface MasteringParams {
  // --- 基本パラメータ ---
  gain_adjustment_db: number;
  eq_adjustments: EQAdjustment[];
  limiter_ceiling_db: number;

  // --- Signature Engine Parameters (AI が決定する「色気」) ---
  tube_drive_amount: number;
  exciter_amount: number;
  low_contour_amount: number;
  width_amount: number;

  tube_hpf_hz?: number;
  exciter_hpf_hz?: number;
  transient_attack_s?: number;
  transient_release_s?: number;
  limiter_attack_s?: number;
  limiter_release_s?: number;

  // --- Target Logic (アルゴリズムが強制する目標値) ---
  target_lufs?: number;

  // --- Self-Correction (フィードバックループ用。未指定時はフォールバック) ---
  self_correction_lufs_tolerance_db?: number;
  self_correction_max_gain_step_db?: number;
  self_correction_max_boost_db?: number;
  self_correction_max_peak_cut_db?: number;
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
  artworkUrl: string;
  notes: string;
  fileName?: string;
  masteringTarget?: MasteringTarget | null;
  createdAt: string;
}

export type PlaylistPlatform = 'spotify' | 'beatport' | 'apple' | 'other';

/** プレイリスト入りチェック（グラウンディング） */
export interface PlaylistCheckItem {
  id: string;
  trackId: string;
  platform: PlaylistPlatform;
  playlistName: string;
  checked: boolean;
  checkedAt: string | null;
}

/** メールマーケティング用コンタクト */
export interface EmailContact {
  id: string;
  email: string;
  name: string;
  addedAt: string;
}
