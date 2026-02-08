
export interface FrequencyData {
  name: string;
  level: number;
}

export interface AudioAnalysisData {
  lufs: number;
  truePeak: number;
  dynamicRange: number;
  stereoWidth: number;
  peakRMS: number;
  bassVolume: number;
  crestFactor: number;
  frequencyData: FrequencyData[];
  waveform: number[];
  phaseCorrelation?: number; // -1 to +1 (位相相関)
  distortionPercent?: number; // THD近似（クリッピング率）
  noiseFloorDb?: number; // ノイズフロア（-dB）
}

export type MasteringTarget = 'beatport' | 'spotify';

export type MetricStatus = 'good' | 'warning' | 'bad' | 'neutral';

export interface EQAdjustment {
  type: BiquadFilterType;
  frequency: number;
  gain_db: number;
  q: number;
}

export interface MasteringParams {
  gain_adjustment_db: number;
  limiter_ceiling_db: number;
  eq_adjustments: EQAdjustment[];
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
