
import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';

type Language = 'ja' | 'en';

const ja = {
  "header.title": "AI マスタリング・エージェント (Techno/Trance)",
  "footer.copyright": "© {year} AI Mastering Solutions. 全著作権所有。",
  "section.step1.title": "音源アップロード",
  "section.step2.title": "Beatport/Spotify 配信基準分析",
  "section.step3.title": "AI マスタリング提案・処理",
  "upload.pyodide.loading": "分析システム起動中...",
  "upload.pyodide.installing": "音響解析ライブラリ準備中...",
  "upload.pyodide.ready": "システム準備完了",
  "upload.pyodide.error": "初期化失敗",
  "upload.pyodide.detail": "ブラウザ内で高精度なEBU R 128分析環境を構築しています。",
  "upload.analyzing": "音響スキャン実行中...",
  "upload.analyzing.detail": "LUFS・トゥルービーク・クレストファクター・波形・周波数分布を解析しています。",
  "upload.cta.title": "マスタリングする音源を選択",
  "upload.cta.detail": "WAV / MP3 / AIFF (24bit/44.1kHz以上推奨)",
  "upload.loaded": "読み込み完了:",
  "upload.aria.label": "音源をアップロード",
  "analysis.waveform.title": "波形解析 (Waveform)",
  "analysis.spectrum.title": "周波数特性 (Spectrum)",
  "analysis.button.get_suggestion": "AIマスタリングを計算する",
  "analysis.button.generating": "エージェントがパラメータを演算中...",
  "analysis.button.copy": "分析レポートをコピー",
  "analysis.metric.lufs": "統合ラウドネス (LUFS)",
  "analysis.metric.peak": "トゥルーピーク (dBTP)",
  "analysis.metric.crest": "クレストファクター (Dynamic)",
  "analysis.metric.width": "ステレオ幅 (Stereo Width)",
  "analysis.metric.rms": "ピークRMS",
  "analysis.metric.bass": "低域エネルギー (Bass)",
  "analysis.target.beatport.lufs": "目標: -7.0 LUFS (-6.0 〜 -8.0)",
  "analysis.target.beatport.peak": "目標: -0.1 dBTP (MAX)",
  "analysis.target.beatport.crest": "目標: 6.0 dB (5.0 〜 8.0)",
  "analysis.target.spotify.lufs": "目標: -14.0 LUFS",
  "analysis.target.spotify.peak": "目標: -1.0 dBTP",
  "analysis.target.spotify.crest": "目標: 9.0 dB (8.0 〜 12.0)",
  "analysis.label.current": "現在値:",
  "analysis.label.target": "配信基準:",
  "analysis.value.db": "{value} dB",
  "analysis.value.dbtp": "{value} dBTP",
  "analysis.value.percent": "{value}%",
  "platform_selector.title": "マスタリング・ターゲット設定",
  "platform.beatport": "Beatport (Techno/Trance)",
  "platform.spotify": "Spotify (Streaming)",
  "agent.idle.title": "AIエージェント待機中",
  "agent.idle.detail": "トラックをアップロードすると、AIが最適な処理パラメータを算出します。",
  "agent.loading.title": "テクノ・トランス基準への最適化中...",
  "agent.loading.detail": "目標値 -7.0 LUFS / -0.1 dBTP への到達経路を計算しています。",
  "agent.params.title": "AI 算出パラメータ (DSP設定)",
  "agent.params.gain": "目標ラウドネスへのゲイン補正",
  "agent.params.limiter": "リミッター・シーリング設定",
  "agent.params.eq": "周波数バランス補正 (EQ)",
  "agent.params.eq.format": ": {gain}dB @ {frequency}Hz (Q: {q})",
  "agent.params.eq.not_needed": "補正不要 (バランス良好)",
  "agent.preview.title": "同一トラック比較プレビュー",
  "agent.preview.mastered": "マスター (AI処理)",
  "agent.preview.original": "オリジナル (A/B比較)",
  "agent.preview.peak_live": "再生中 Peak（判断用）",
  "agent.preview.visualizer": "再生レベル（周波数）",
  "agent.preview.visualizer_idle": "再生でリアルタイム表示",
  "agent.preview.params_short": "Gain / リミッター",
  "agent.file_size": "書き出しサイズ 約 {size}",
  "agent.button.download": "マスタリング済みWAVを書き出し",
  "agent.button.copy_params": "パラメータをコピー (DAW用)",
  "agent.button.processing": "高精度レンダリング中...",
  "common.copied": "コピー完了",
  "console.title": "エージェント行動ログ",
  "language.ja": "日本語",
  "language.en": "English",
  "nav.mastering": "マスタリング",
  "nav.pricing": "料金",
  "nav.login": "ログイン",
  "pricing.title": "料金",
  "pricing.coming_soon": "準備中です。",
  "nav.library": "ライブラリ",
  "nav.checklist": "チェック",
  "nav.email": "メール",
  "nav.sns": "SNS",
  "nav.mypage": "マイページ",
  "nav.admin": "管理",
  "auth.download_gate.title": "ダウンロードにはログインが必要です",
  "auth.download_gate.description": "Googleでログインするとダウンロードできます。",
  "auth.sign_in_google": "Googleでログイン",
  "auth.cancel": "キャンセル",
  "modal.close_back": "閉じてトップへ",
  "modal.close_back_aria": "モーダルを閉じてマスタリング画面に戻る",
  "modal.next_track": "次の曲をアップロード",
  "modal.next_track_aria": "次の曲をアップロードしてマスタリングを続ける"
};

const en = {
  "header.title": "AI Mastering Agent (Techno/Trance)",
  "footer.copyright": "© {year} AI Mastering Solutions. All rights reserved.",
  "section.step1.title": "Upload Track",
  "section.step2.title": "Distribution Standards Analysis",
  "section.step3.title": "AI Mastering Proposal",
  "upload.pyodide.loading": "Loading Engine...",
  "upload.pyodide.installing": "Installing Libraries...",
  "upload.pyodide.ready": "System Ready",
  "upload.pyodide.error": "Init Error",
  "upload.pyodide.detail": "Building high-precision analysis environment in browser.",
  "upload.analyzing": "Analyzing Audio...",
  "upload.analyzing.detail": "Measuring LUFS, true peak, crest factor, waveform & frequency spectrum.",
  "upload.cta.title": "Upload Audio",
  "upload.cta.detail": "WAV / MP3 / AIFF (24bit recommended)",
  "upload.loaded": "Loaded:",
  "upload.aria.label": "Upload file",
  "analysis.waveform.title": "Waveform Analysis",
  "analysis.spectrum.title": "Frequency Spectrum",
  "analysis.button.get_suggestion": "Generate AI Suggestion",
  "analysis.button.generating": "Agent calculating...",
  "analysis.button.copy": "Copy Analysis Report",
  "analysis.metric.lufs": "Integrated LUFS",
  "analysis.metric.peak": "True Peak",
  "analysis.metric.crest": "Crest Factor",
  "analysis.metric.width": "Stereo Width",
  "analysis.metric.rms": "Peak RMS",
  "analysis.metric.bass": "Bass Energy",
  "analysis.target.beatport.lufs": "Target: -7.0 LUFS (-6.0 to -8.0)",
  "analysis.target.beatport.peak": "Target: -0.1 dBTP (MAX)",
  "analysis.target.beatport.crest": "Target: 6.0 dB (5.0 to 8.0)",
  "analysis.target.spotify.lufs": "Target: -14.0 LUFS",
  "analysis.target.spotify.peak": "Target: -1.0 dBTP",
  "analysis.target.spotify.crest": "Target: 9.0 dB (8.0 to 12.0)",
  "analysis.label.current": "Current:",
  "analysis.label.target": "Standard:",
  "analysis.value.db": "{value} dB",
  "analysis.value.dbtp": "{value} dBTP",
  "analysis.value.percent": "{value}%",
  "platform_selector.title": "Mastering Target Configuration",
  "platform.beatport": "Beatport (Techno/Trance)",
  "platform.spotify": "Spotify (Streaming)",
  "agent.idle.title": "Agent Idle",
  "agent.idle.detail": "Upload a track to get distribution-ready suggestions.",
  "agent.loading.title": "Optimizing for Techno/Trance...",
  "agent.loading.detail": "Calculating path to reach -7.0 LUFS / -0.1 dBTP.",
  "agent.params.title": "AI Proposed Parameters",
  "agent.params.gain": "Gain Adjustment for LUFS",
  "agent.params.limiter": "Peak Limiting Configuration",
  "agent.params.eq": "Frequency Balance Correction",
  "agent.params.eq.format": ": {gain}dB @ {frequency}Hz (Q: {q})",
  "agent.params.eq.not_needed": "No correction needed",
  "agent.preview.title": "A/B Preview",
  "agent.preview.mastered": "Master (AI)",
  "agent.preview.original": "Original (A/B)",
  "agent.preview.peak_live": "Peak (live, for A/B)",
  "agent.preview.visualizer": "Playback level (frequency)",
  "agent.preview.visualizer_idle": "Real-time when playing",
  "agent.preview.params_short": "Gain / Limiter",
  "agent.file_size": "Export size ~{size}",
  "agent.button.download": "Export Mastered WAV",
  "agent.button.copy_params": "Copy Parameters (for DAW)",
  "agent.button.processing": "Exporting Audio...",
  "common.copied": "Copied!",
  "console.title": "AI Analysis Logs",
  "language.ja": "日本語",
  "language.en": "English",
  "nav.mastering": "Mastering",
  "nav.pricing": "Pricing",
  "nav.login": "Login",
  "pricing.title": "Pricing",
  "pricing.coming_soon": "Coming soon.",
  "nav.library": "Library",
  "nav.checklist": "Check",
  "nav.email": "Email",
  "nav.sns": "SNS",
  "nav.mypage": "My Page",
  "nav.admin": "Admin",
  "auth.download_gate.title": "Sign in to download",
  "auth.download_gate.description": "Sign in with Google to download your mastered file.",
  "auth.sign_in_google": "Sign in with Google",
  "auth.cancel": "Cancel",
  "modal.close_back": "Close (back to top)",
  "modal.close_back_aria": "Close modal and return to mastering screen",
  "modal.next_track": "Upload Next Track",
  "modal.next_track_aria": "Upload next track and continue mastering"
};

const translations: Record<Language, Record<string, string>> = { ja, en };

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, options?: { replacements?: Record<string, string | number>, default?: string }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('ja');
  const t = useCallback((key: string, options?: { replacements?: Record<string, string | number>, default?: string }) => {
    let translation = translations[language][key] || options?.default || key;
    if (options?.replacements) {
        Object.entries(options.replacements).forEach(([key, value]) => {
            translation = translation.replace(`{${key}}`, String(value));
        });
    }
    return translation;
  }, [language]);
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useTranslation must be used within a LanguageProvider');
  return context;
};
