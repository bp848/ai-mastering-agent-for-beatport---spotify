
import React, { useState, useCallback, useEffect } from 'react';
import type { AudioAnalysisData, MasteringTarget, MasteringParams, PlatformSection } from './types';
import { analyzeAudioFile, applyMasteringAndExport, optimizeMasteringParams } from './services/audioService';
import { getMasteringSuggestions, isOpenAIAvailable } from './services/aiService';
import FileUpload from './components/FileUpload';
import AnalysisDisplay from './components/AnalysisDisplay';
import MasteringAgent from './components/MasteringAgent';
import PlatformNav from './components/PlatformNav';
import PricingView from './components/PricingView';
import LibraryView from './components/LibraryView';
import ChecklistView from './components/ChecklistView';
import EmailView from './components/EmailView';
import SNSView from './components/SNSView';
import { BrandIcon, Spinner } from './components/Icons';
import { LanguageProvider, useTranslation } from './contexts/LanguageContext';
import { PlatformProvider, usePlatform } from './contexts/PlatformContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LanguageSwitcher from './components/LanguageSwitcher';
import DownloadGateModal from './components/DownloadGateModal';
import PaywallModal from './components/PaywallModal';
import ResultsModal from './components/ResultsModal';
import HeroEngine from './components/HeroEngine';
import AnalysisTerminal from './components/AnalysisTerminal';
import StatusLoader from './components/StatusLoader';
import DiagnosisReport from './components/DiagnosisReport';
import PlatformSelector from './components/PlatformSelector';
import FlowSteps from './components/FlowSteps';
import type { ActionLog } from './components/Console';
import MyPageView from './components/MyPageView';
import { recordDownload } from './services/downloadHistory';
import { supabase } from './services/supabase';
import { trackEvent } from './services/analytics';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

const HASH_TO_SECTION: Record<string, PlatformSection> = {
  mastering: 'mastering', pricing: 'pricing', mypage: 'mypage', library: 'library',
  checklist: 'checklist', email: 'email', sns: 'sns', admin: 'admin',
};
function getSectionFromHash(): PlatformSection {
  if (typeof window === 'undefined') return 'mastering';
  const h = window.location.hash.slice(1).toLowerCase().replace(/^#/, '') || 'mastering';
  if (h === 'result') return 'mastering';
  return HASH_TO_SECTION[h] ?? 'mastering';
}

const AppContent: React.FC = () => {
  console.log('[v0] AppContent rendering');
  const [section, setSection] = useState<PlatformSection>(() => getSectionFromHash());
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [analysisData, setAnalysisData] = useState<AudioAnalysisData | null>(null);
  const [masteringParams, setMasteringParams] = useState<MasteringParams | null>(null);
  const [masterMetrics, setMasterMetrics] = useState<{ lufs: number; peakDb: number } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);   // Phase 1-2
  const [isMastering, setIsMastering] = useState<boolean>(false);   // Phase 3-4
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [masteringTarget, setMasteringTarget] = useState<MasteringTarget>('beatport');
  const [showSaveToLibrary, setShowSaveToLibrary] = useState(false);
  const [saveToLibraryForm, setSaveToLibraryForm] = useState({ title: '', artist: '', album: '', genre: 'Techno', isrc: '', releaseDate: '' });

  const [pyodideStatus, setPyodideStatus] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [showDownloadGate, setShowDownloadGate] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showPostLoginBanner, setShowPostLoginBanner] = useState(false);
  const [rawMasteringResponseText, setRawMasteringResponseText] = useState<string | null>(null);
  const { t, language } = useTranslation();
  const { addTrack } = usePlatform();
  const { session, loading: authLoading, signInWithGoogle } = useAuth();

  // URLハッシュとセクションを同期（ページ共有可能にする）
  useEffect(() => {
    const newHash = showResultsModal ? 'result' : section;
    if (typeof window !== 'undefined' && window.location.hash.slice(1).toLowerCase() !== newHash) {
      window.location.hash = newHash;
    }
  }, [section, showResultsModal]);
  useEffect(() => {
    const onHash = () => setSection(getSectionFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (session && showDownloadGate) setShowDownloadGate(false);
  }, [session, showDownloadGate]);

  useEffect(() => {
    if (authLoading || !session) return;
    try {
      if (sessionStorage.getItem('pending_download') === '1') {
        sessionStorage.removeItem('pending_download');
        setShowPostLoginBanner(true);
      }
    } catch (_) {}
  }, [session, authLoading]);

  // 購入完了時: /thankyou で始まるページ または ?checkout=success で Google 広告コンバージョン「購入 (3)」を1回だけ送信
  useEffect(() => {
    const pathname = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const isThankYouPage = pathname.startsWith('/thankyou');
    const isCheckoutSuccess = params.get('checkout') === 'success';
    if (!isThankYouPage && !isCheckoutSuccess) return;
    try {
      const sentKey = 'gtag_purchase_conversion_sent';
      if (sessionStorage.getItem(sentKey) === '1') return;
      const gtag = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
      if (typeof gtag === 'function') {
        gtag('event', 'conversion', {
          send_to: 'AW-952809033/5-VLCPmdq_YbEMnsqsYD',
          value: 1.0,
          currency: 'JPY',
          transaction_id: '',
        });
        sessionStorage.setItem(sentKey, '1');
      }
      if (isCheckoutSuccess) window.history.replaceState({}, '', pathname + window.location.hash);
    } catch (_) {}
  }, []);

  const addLog = useCallback((message: string) => {
    const locale = language === 'ja' ? 'ja-JP' : 'en-US';
    const timestamp = new Date().toLocaleTimeString(locale, { hour12: false });
    setLogs(prevLogs => [...prevLogs, `[${timestamp}] ${message}`]);
  }, [language]);

  // 初期化
  useEffect(() => {
    async function setupPyodide() {
      try {
        setPyodideStatus(t('upload.pyodide.loading'));
        // Fixed: Use (window as any) to access loadPyodide which is injected globally via script tag
        const pyodide = await (window as any).loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/"
        });
        // Fixed: Use (window as any) to assign pyodide to the global window object
        (window as any).pyodide = pyodide;
        await pyodide.loadPackage("micropip");
        const micropip = pyodide.pyimport("micropip");
        await micropip.install(['numpy', 'scipy', 'pyloudnorm']);
        setPyodideStatus(t('upload.pyodide.ready'));
        addLog(t('log.pyodide.ready'));
      } catch (error) {
        setError(t('error.pyodide.init'));
        setPyodideStatus(t('upload.pyodide.error'));
      }
    }
    setupPyodide();
  }, [t, addLog]);

  const addActionLog = useCallback((phase: string, message: string, toolCall?: string, status: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const locale = language === 'ja' ? 'ja-JP' : 'en-US';
    const timestamp = new Date().toLocaleTimeString(locale, { hour12: false, fractionalSecondDigits: 2 });
    setActionLogs(prev => [...prev, { phase, timestamp, message, toolCall, status }]);
  }, [language]);

  // ── Phase 1-2: 分析のみ（診断レポートを表示するためにここで止まる）──
  const analyzeOnly = useCallback(async (file: File, target: MasteringTarget) => {
    setAudioFile(file);
    setAnalysisData(null);
    setMasteringParams(null);
    setMasterMetrics(null);
    setRawMasteringResponseText(null);
    setError('');
    setIsAnalyzing(true);
    setActionLogs([]);

    trackEvent('upload_start', { file_name: file.name, file_size: file.size, target }, session?.user?.id ?? undefined);
    supabase.from('upload_events').insert({ user_id: session?.user?.id ?? null, file_name: file.name, file_size_bytes: file.size }).then(() => {}, () => {});

    try {
      addActionLog('INIT', language === 'ja' ? 'タイトル情報を破棄。純粋な波形データとして読み込み開始。' : 'Discarding title metadata. Loading as pure waveform data.', undefined, 'info');
      addActionLog('INIT', language === 'ja' ? `ファイル: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)` : `File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`, undefined, 'info');
      addActionLog('FFT', language === 'ja' ? 'Python分析エンジン起動: numpy, scipy, pyloudnorm' : 'Python analysis engine: numpy, scipy, pyloudnorm', 'analyze_audio_metrics', 'info');
      addActionLog('FFT', language === 'ja' ? '周波数スペクトル解析 (FFT)...' : 'Analyzing Frequency Spectrum (FFT)...', 'FFT_Analysis', 'info');

      addLog(t('log.audio.analysis_start'));
      const { analysisData: result, audioBuffer: buffer } = await analyzeAudioFile(file);

      const targetLufs = target === 'beatport' ? -8.0 : -14.0;
      const lufsGap = targetLufs - result.lufs;
      addActionLog('LUFS', language === 'ja'
        ? `ラウドネス計測: ${result.lufs.toFixed(2)} LUFS → 目標 ${targetLufs} まで ${lufsGap > 0 ? '+' : ''}${lufsGap.toFixed(1)} dB`
        : `Loudness: ${result.lufs.toFixed(2)} LUFS → ${lufsGap > 0 ? '+' : ''}${lufsGap.toFixed(1)} dB to target ${targetLufs}`, undefined, 'success');

      addActionLog('PEAK', language === 'ja'
        ? `トゥルーピーク: ${result.truePeak.toFixed(2)} dBTP`
        : `True Peak: ${result.truePeak.toFixed(2)} dBTP`, undefined, result.truePeak <= (target === 'beatport' ? -0.3 : -1.0) ? 'success' : 'warning');

      const phaseStatus = result.phaseCorrelation > 0.5 ? 'success' : result.phaseCorrelation > 0 ? 'warning' : 'error';
      addActionLog('PHASE', language === 'ja'
        ? `位相相関検出: ${result.phaseCorrelation.toFixed(3)}`
        : `Phase correlation: ${result.phaseCorrelation.toFixed(3)}`, 'Phase_Detector', phaseStatus as 'info' | 'success' | 'warning' | 'error');

      if (result.distortionPercent > 0.1) {
        addActionLog('THD', language === 'ja'
          ? `歪み検出: ${result.distortionPercent.toFixed(2)}% (クリッピング疑い)`
          : `Distortion: ${result.distortionPercent.toFixed(2)}% (clipping suspected)`, 'THD_Analyzer', 'warning');
      }

      addActionLog('NOISE', language === 'ja'
        ? `ノイズフロア: ${result.noiseFloorDb.toFixed(1)} dB`
        : `Noise floor: ${result.noiseFloorDb.toFixed(1)} dB`, 'Noise_Gate', result.noiseFloorDb < -80 ? 'success' : 'warning');

      addActionLog('DONE', language === 'ja' ? '構造分析完了 — 診断レポートを生成します。' : 'Structural analysis complete — generating diagnosis report.', undefined, 'success');

      setAnalysisData(result);
      setAudioBuffer(buffer);
      trackEvent('analysis_complete', { target, lufs: result.lufs, true_peak: result.truePeak }, session?.user?.id ?? undefined);
      addLog(t('log.audio.analysis_complete'));
    } catch (err) {
      const errorKey = err instanceof Error ? err.message : 'error.audio.analysis';
      addActionLog('ERROR', t(errorKey, { default: t('error.audio.analysis') }), undefined, 'error');
      setError(t(errorKey, { default: t('error.audio.analysis') }));
    } finally {
      setIsAnalyzing(false);
    }
  }, [t, language, addLog, addActionLog, session?.user?.id]);

  // ── Phase 3-4: AIマスタリング実行（ユーザーが Execute ボタンを押した後）──
  const executeMastering = useCallback(async () => {
    if (!analysisData || !audioBuffer) return;
    setIsMastering(true);
    setError('');

    try {
      addActionLog('AI', language === 'ja' ? 'AIエージェント: Beatport top基準への最適化パラメータ算出中...' : 'AI Agent: Calculating optimization parameters...', 'getMasteringSuggestions', 'info');
      addLog(t('log.gemini.request'));

      const { params: rawParams, rawResponseText } = await getMasteringSuggestions(analysisData, masteringTarget, language);
      setRawMasteringResponseText(rawResponseText);

      if (rawParams.eq_adjustments?.length) {
        rawParams.eq_adjustments.forEach((eq, i) => {
          addActionLog('EQ', language === 'ja'
            ? `EQ ${i + 1}: ${eq.frequency}Hz ${eq.gain_db > 0 ? '+' : ''}${eq.gain_db.toFixed(1)} dB (Q:${eq.q.toFixed(2)})`
            : `EQ ${i + 1}: ${eq.frequency}Hz ${eq.gain_db > 0 ? '+' : ''}${eq.gain_db.toFixed(1)} dB (Q:${eq.q.toFixed(2)})`, 'Linear_Phase_EQ', 'info');
        });
      }

      addActionLog('SIG', language === 'ja'
        ? `Tube: ${rawParams.tube_drive_amount.toFixed(1)} / Exciter: ${rawParams.exciter_amount.toFixed(2)} / Contour: ${rawParams.low_contour_amount.toFixed(1)} / Width: ${rawParams.width_amount.toFixed(2)}`
        : `Tube: ${rawParams.tube_drive_amount.toFixed(1)} / Exciter: ${rawParams.exciter_amount.toFixed(2)} / Contour: ${rawParams.low_contour_amount.toFixed(1)} / Width: ${rawParams.width_amount.toFixed(2)}`, 'Signature_Sound', 'info');

      addActionLog('LIM', language === 'ja'
        ? `リミッター: シーリング ${rawParams.limiter_ceiling_db.toFixed(1)} dBTP`
        : `Limiter: ceiling ${rawParams.limiter_ceiling_db.toFixed(1)} dBTP`, 'Brickwall_Limiter', 'info');

      // Phase 4: Auto-Correction
      const targetLufsValue = masteringTarget === 'beatport' ? -8.0 : -14.0;
      rawParams.target_lufs = targetLufsValue;

      addActionLog('CORR', language === 'ja'
        ? `自己補正: 目標 ${targetLufsValue} LUFS（サビ10秒シミュレーション → ゲイン自動補正）`
        : `Self-correction: target ${targetLufsValue} LUFS (10s simulation → gain auto-adjust)`, 'optimizeMasteringParams', 'info');

      const optimizeResult = await optimizeMasteringParams(audioBuffer, rawParams);
      const validatedParams = optimizeResult.params;

      setMasterMetrics({ lufs: optimizeResult.measuredLufs, peakDb: optimizeResult.measuredPeakDb });

      const gainDelta = validatedParams.gain_adjustment_db - rawParams.gain_adjustment_db;
      if (Math.abs(gainDelta) > 0.1) {
        addActionLog('CORR', language === 'ja'
          ? `ゲイン補正: ${rawParams.gain_adjustment_db.toFixed(1)} → ${validatedParams.gain_adjustment_db.toFixed(1)} dB (Δ ${gainDelta > 0 ? '+' : ''}${gainDelta.toFixed(1)})`
          : `Gain corrected: ${rawParams.gain_adjustment_db.toFixed(1)} → ${validatedParams.gain_adjustment_db.toFixed(1)} dB (Δ ${gainDelta > 0 ? '+' : ''}${gainDelta.toFixed(1)})`, 'Auto_Correction', 'warning');
      } else {
        addActionLog('CORR', language === 'ja'
          ? '補正不要 — AI提案値がLUFS±0.5dB以内'
          : 'No correction needed — AI proposal within ±0.5 dB', 'Auto_Correction', 'success');
      }

      // Neuro-Drive Module ログ
      addActionLog('NEURO', language === 'ja'
        ? 'Neuro-Drive Module: Parallel Hyper-Compression 起動 (Threshold: -30dB, Ratio: 12:1, Attack: 5ms)'
        : 'Neuro-Drive Module: Parallel Hyper-Compression active (Threshold: -30dB, Ratio: 12:1, Attack: 5ms)', 'HyperCompressor', 'info');
      addActionLog('NEURO', language === 'ja'
        ? 'Energy Filter: 250Hz HPF — キック/ベースの位相干渉を回避'
        : 'Energy Filter: 250Hz HPF — avoiding kick/bass phase interference', 'EnergyFilter', 'info');
      addActionLog('NEURO', language === 'ja'
        ? 'Air Exciter: 12kHz+ High-Shelf +4.0dB — 超高域の覚醒刺激'
        : 'Air Exciter: 12kHz+ High-Shelf +4.0dB — hyper-high frequency stimulation', 'AirExciter', 'info');
      addActionLog('NEURO', language === 'ja'
        ? 'Neuro Injection: Density +35% (Parallel Mix) — Hyper-Saturation Active'
        : 'Neuro Injection: Density +35% (Parallel Mix) — Hyper-Saturation Active', 'NeuroMix', 'success');

      setMasteringParams(validatedParams);
      addActionLog('DONE', language === 'ja' ? '最適化完了: Beatport top 基準に物理適合' : 'Optimization complete: physically validated', undefined, 'success');
      addLog(t('log.gemini.success'));
      setShowResultsModal(true);
    } catch (err) {
      const errorKey = err instanceof Error ? err.message : 'error.audio.analysis';
      addActionLog('ERROR', t(errorKey, { default: t('error.audio.analysis') }), undefined, 'error');
      setError(t(errorKey, { default: t('error.audio.analysis') }));
    } finally {
      setIsMastering(false);
    }
  }, [analysisData, audioBuffer, masteringTarget, t, language, addLog, addActionLog]);

  /** リトライ時: 指定した AI でパラメータを再計算し結果を更新 */
  const recalcParamsWithAI = useCallback(async () => {
    if (!analysisData || !audioBuffer) return;
    setIsMastering(true);
    setError('');
    try {
      addActionLog(
        'AI',
        language === 'ja'
          ? 'AI再計算: OpenAI でパラメータを再取得中...'
          : 'Re-calculating with OpenAI...',
        'getMasteringSuggestions',
        'info'
      );
      const { params: rawParams, rawResponseText } = await getMasteringSuggestions(analysisData, masteringTarget, language);
      setRawMasteringResponseText(rawResponseText);
      const targetLufsValue = masteringTarget === 'beatport' ? -8.0 : -14.0;
      rawParams.target_lufs = targetLufsValue;
      const optimizeResult = await optimizeMasteringParams(audioBuffer, rawParams);
      setMasteringParams(optimizeResult.params);
      setMasterMetrics({ lufs: optimizeResult.measuredLufs, peakDb: optimizeResult.measuredPeakDb });
      addActionLog(
        'DONE',
        language === 'ja' ? 'OpenAI で再計算完了' : 'Re-calc done with OpenAI',
        undefined,
        'success'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'error.audio.analysis';
      addActionLog('ERROR', t(msg, { default: t('error.audio.analysis') }), undefined, 'error');
      setError(t(msg, { default: t('error.audio.analysis') }));
    } finally {
      setIsMastering(false);
    }
  }, [analysisData, audioBuffer, masteringTarget, language, t, addActionLog]);

  const handleFileChange = useCallback((file: File | null) => {
    if (file) analyzeOnly(file, masteringTarget);
  }, [analyzeOnly, masteringTarget]);

  const handleDownload = useCallback(async () => {
    if (!masteringParams || !audioBuffer || !audioFile) return;
    if (!session?.user) {
      setShowDownloadGate(true);
      return;
    }
    const accessToken = session.access_token;
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    let serverAllowed = false;
    try {
      const res = await fetch(`${base}/api/check-download-entitlement`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json().catch(() => ({}));
      serverAllowed = res.ok && data?.allowed === true;
    } catch (_) {
      serverAllowed = false;
    }
    if (!serverAllowed) {
      setShowPaywall(true);
      return;
    }
    // ダウンロード実行前にトークン1件消費（管理者は消費されない）
    try {
      const consumeRes = await fetch(`${base}/api/consume-download-token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const consumeData = await consumeRes.json().catch(() => ({}));
      if (!consumeRes.ok || (consumeData.consumed === false && consumeData.admin !== true)) {
        setShowPaywall(true);
        return;
      }
    } catch (_) {
      setShowPaywall(true);
      return;
    }
    try {
      setIsExporting(true);
      const masteredBlob = await applyMasteringAndExport(audioBuffer, masteringParams);
      let storagePath: string | undefined;
      try {
        const path = `${session.user.id}/${crypto.randomUUID()}.wav`;
        const { error: uploadError } = await supabase.storage
          .from('mastered')
          .upload(path, masteredBlob, { contentType: 'audio/wav', upsert: false });
        if (!uploadError) storagePath = path;
      } catch (_) {
        // Storage 未設定やアップロード失敗時は履歴のみ（再DL不可）
      }
      await recordDownload(session.user.id, audioFile.name, masteringTarget, undefined, storagePath);
      trackEvent('download', { file_name: audioFile.name, target: masteringTarget, storage_path: storagePath }, session.user.id);
      setShowResultsModal(false);
      setSection('mypage');
    } catch (e) {
      setError(t('error.download.fail'));
    } finally {
      setIsExporting(false);
    }
  }, [masteringParams, audioBuffer, audioFile, masteringTarget, t, session?.user]);

  const openSaveToLibrary = useCallback(() => {
    const baseName = audioFile?.name?.replace(/\.[^/.]+$/, '') ?? 'Untitled';
    setSaveToLibraryForm((prev) => ({ ...prev, title: baseName }));
    setShowSaveToLibrary(true);
  }, [audioFile?.name]);

  const handleSaveToLibrary = useCallback(() => {
    if (!saveToLibraryForm.title.trim() || !saveToLibraryForm.artist.trim()) return;
    addTrack({
      title: saveToLibraryForm.title.trim(),
      artist: saveToLibraryForm.artist.trim(),
      album: saveToLibraryForm.album.trim(),
      genre: saveToLibraryForm.genre.trim() || 'Techno',
      isrc: saveToLibraryForm.isrc.trim(),
      releaseDate: saveToLibraryForm.releaseDate.trim(),
      artworkUrl: '',
      fileName: audioFile?.name ?? '',
      masteringTarget,
    });
    setShowSaveToLibrary(false);
    setSaveToLibraryForm({ title: '', artist: '', album: '', genre: 'Techno', isrc: '', releaseDate: '' });
    setShowResultsModal(false);
    setSection('library');
  }, [audioFile, masteringTarget, addTrack, saveToLibraryForm]);

  // ── 4ステップ: アップロード → 分析 → 実行 → 聴く・購入 ──
  const isProcessing = isAnalyzing || isMastering;
  const step = !audioFile ? 1 : isAnalyzing ? 2 : (!masteringParams && analysisData) ? 3 : masteringParams ? 4 : 2;
  const stepLabels = [t('steps.upload'), t('steps.analyze'), t('steps.run'), t('steps.listen')];

  const resetToUpload = useCallback(() => {
    setAudioFile(null);
    setAudioBuffer(null);
    setAnalysisData(null);
    setMasteringParams(null);
    setMasterMetrics(null);
    setRawMasteringResponseText(null);
    setError('');
    setActionLogs([]);
    setShowResultsModal(false);
  }, []);

  return (
    <div className="min-h-screen min-h-[100dvh] text-zinc-300 px-3 py-4 sm:px-5 sm:py-6 lg:px-10 lg:py-8 pb-[env(safe-area-inset-bottom)] selection:bg-cyan-500/30">
      <div className="max-w-screen-2xl mx-auto w-full">
        {showPostLoginBanner && (
          <div className="mb-4 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex flex-wrap items-center justify-between gap-3 animate-fade-up">
            <p className="text-sm text-cyan-200">{t('flow.post_login_banner')}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setSection('mastering'); setShowPostLoginBanner(false); }}
                className="px-4 py-2 rounded-lg bg-cyan-500 text-black font-bold text-sm hover:bg-cyan-400 transition-colors"
              >
                {t('flow.post_login_cta')}
              </button>
              <button
                type="button"
                onClick={() => setShowPostLoginBanner(false)}
                className="px-3 py-2 text-xs text-zinc-400 hover:text-white"
                aria-label={language === 'ja' ? '閉じる' : 'Dismiss'}
              >
                ×
              </button>
            </div>
          </div>
        )}
        <header className="flex items-center justify-between gap-2 mb-6 sm:mb-8 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <BrandIcon />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-white tracking-tight">{t('header.title')}</h1>
              <span className="text-[10px] text-zinc-500">{language === 'ja' ? '音源をアップロードしてAI解析（配信先は診断画面で選択）' : 'Upload to analyze · choose target on diagnosis'}</span>
            </div>
            <div className="shrink-0 ml-2">
              <LanguageSwitcher />
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <PlatformNav
              current={section}
              onSelect={setSection}
              session={session}
              onLoginClick={() => {
                if (session?.user) setSection('mypage');
                else signInWithGoogle();
              }}
            />
          </div>
        </header>

        {section !== 'mastering' && (
          <main className="animate-fade-up">
            {section === 'pricing' && <PricingView />}
            {section === 'mypage' && <MyPageView onNavigateToMastering={() => setSection('mastering')} />}
            {section === 'library' && <LibraryView />}
            {section === 'checklist' && <ChecklistView />}
            {section === 'email' && <EmailView />}
            {section === 'sns' && <SNSView />}
          </main>
        )}

        <DownloadGateModal
          open={showDownloadGate}
          onClose={() => setShowDownloadGate(false)}
          onSignInWithGoogle={signInWithGoogle}
        />

        <PaywallModal
          open={showPaywall}
          onClose={() => setShowPaywall(false)}
          onGoToPricing={() => setSection('pricing')}
        />

        {analysisData && masteringParams && (
          <ResultsModal
            open={showResultsModal}
            onClose={() => setShowResultsModal(false)}
            analysisData={analysisData}
            masteringParams={masteringParams}
            masteringTarget={masteringTarget}
            onDownloadMastered={handleDownload}
            isProcessingAudio={isExporting}
            audioBuffer={audioBuffer}
            audioFile={audioFile}
            onSaveToLibrary={handleSaveToLibrary}
            saveToLibraryForm={saveToLibraryForm}
            onSaveFormChange={(k, v) => setSaveToLibraryForm((p) => ({ ...p, [k]: v }))}
            showSaveToLibrary={showSaveToLibrary}
            onToggleSaveToLibrary={() => {
              if (!showSaveToLibrary && audioFile) {
                const base = audioFile.name.replace(/\.[^/.]+$/, '') || 'Untitled';
                setSaveToLibraryForm((p) => ({ ...p, title: base }));
              }
              setShowSaveToLibrary((b) => !b);
            }}
            language={language}
            actionLogs={actionLogs}
            onFeedbackApply={setMasteringParams}
            onRecalcWithAI={isOpenAIAvailable() ? recalcParamsWithAI : undefined}
            masterMetrics={masterMetrics}
            rawMasteringResponseText={rawMasteringResponseText}
          />
        )}

        {section === 'mastering' && (
        <main className="space-y-4 sm:space-y-6">
          {/* ── Step Indicator (4 steps) ── */}
          <div
            className="flex items-center justify-center gap-1.5 sm:gap-3 py-3 flex-wrap"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={4}
            aria-label={language === 'ja' ? `ステップ ${step} / 4: ${stepLabels[step - 1]}` : `Step ${step} of 4: ${stepLabels[step - 1]}`}
          >
            {[1, 2, 3, 4].map((s) => (
              <React.Fragment key={s}>
                <div className="flex items-center gap-1.5">
                  <div className={`step-dot ${step > s ? 'done' : step === s ? 'active' : 'pending'}`} />
                  <span className={`text-[10px] sm:text-xs font-medium ${step === s ? 'text-cyan-400 font-bold' : step > s ? 'text-white' : 'text-zinc-600'}`}>{stepLabels[s - 1]}</span>
                </div>
                {s < 4 && <div className="w-4 sm:w-6 h-px bg-white/10" />}
              </React.Fragment>
            ))}
          </div>

          {/* トップ: 未アップロード時は2カラム（左・省略説明 / 右・アップロード） ── */}
          {(!analysisData || masteringParams) && (
            <>
              {!audioFile && !isProcessing ? (
                <div className="space-y-6">
                  <FlowSteps language={language} />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
                    <HeroEngine language={language} compact />
                    <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-6 sm:p-8">
                      <p className="text-sm font-semibold text-zinc-300 mb-4" id="upload-instruction">
                        {t('ux.upload_first')}
                      </p>
                      <FileUpload
                        onFileChange={handleFileChange}
                        fileName={audioFile?.name}
                        isAnalyzing={isProcessing}
                        pyodideStatus={pyodideStatus}
                        compact={false}
                      />
                      {error && (
                        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm space-y-3">
                          <p>{error}</p>
                          <button
                            type="button"
                            onClick={() => { setError(''); resetToUpload(); }}
                            className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20"
                          >
                            {t('ux.error_retry')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-6 sm:p-8">
                  <FileUpload
                    onFileChange={handleFileChange}
                    fileName={audioFile?.name}
                    isAnalyzing={isProcessing}
                    pyodideStatus={pyodideStatus}
                    compact={!!(audioFile || isProcessing)}
                  />
                  {error && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm space-y-3">
                      <p>{error}</p>
                      <button
                        type="button"
                        onClick={() => { setError(''); resetToUpload(); }}
                        className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20"
                      >
                        {t('ux.error_retry')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Phase: Processing（ストーリー表示: 分析=精密検査 / マスタリング=構築・注入） ── */}
          {isAnalyzing && <StatusLoader mode="analysis" />}
          {isMastering && <StatusLoader mode="mastering" />}
          {isProcessing && actionLogs.length > 0 && (
            <AnalysisTerminal
              logs={actionLogs}
              title={isMastering ? 'MASTERING_ENGINE' : 'ANALYSIS_ENGINE'}
            />
          )}

          {/* ── Phase: Diagnosis (分析完了 → マスタリング未実行) ── */}
          {!isAnalyzing && !isMastering && analysisData && !masteringParams && (
            <DiagnosisReport
              data={analysisData}
              target={masteringTarget}
              onTargetChange={setMasteringTarget}
              onExecute={executeMastering}
              onChooseOtherFile={resetToUpload}
              isMastering={isMastering}
              language={language}
            />
          )}

          {/* ── Phase: Mastering Complete → View Results ── */}
          {!isProcessing && analysisData && masteringParams && (
            <div className="rounded-xl bg-white/[0.05] border border-white/[0.12] p-8 sm:p-10 animate-fade-up text-center space-y-5 shadow-xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/15 border border-green-400/40 shadow-lg shadow-green-500/10">
                <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse shadow-lg shadow-green-400/50" />
                <span className="text-sm font-extrabold text-green-300 uppercase tracking-wider">
                  {language === 'ja' ? 'マスタリング完了' : 'Mastering Complete'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                {language === 'ja' ? '仕上がりを聴いてからダウンロード' : 'Listen, then download'}
              </h2>
              {masterMetrics && (
                <p className="text-base text-zinc-300 font-mono font-semibold">
                  {language === 'ja' ? 'マスター実測' : 'Master'} LUFS {masterMetrics.lufs.toFixed(1)}
                  {language === 'ja' ? ' · 目標' : ' · Target'} {masteringTarget === 'beatport' ? '-8.0' : '-14.0'}
                </p>
              )}
              <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
                {t('flow.complete_teaser')}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResultsModal(true)}
                  className="px-10 py-4 min-h-[56px] rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-extrabold text-base hover:from-cyan-400 hover:to-cyan-300 active:scale-[0.97] touch-manipulation shadow-xl shadow-cyan-500/30"
                >
                  {language === 'ja' ? '結果を見る（聴く・購入）' : 'View result (listen & purchase)'}
                </button>
                <button
                  type="button"
                  onClick={resetToUpload}
                  className="text-sm text-zinc-400 hover:text-white underline underline-offset-2 font-medium"
                >
                  {t('ux.choose_other_file')}
                </button>
              </div>
            </div>
          )}
        </main>
        )}

        <footer className="mt-8 sm:mt-12 py-4 sm:py-6 border-t border-white/5 flex justify-between items-center text-[10px] text-zinc-600 flex-wrap gap-2">
          <p>{t('footer.copyright', { replacements: { year: new Date().getFullYear() } })}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <a className="hover:text-cyan-400 transition-colors" href={language === 'ja' ? '/operator.html' : '/operator-en.html'} target="_blank" rel="noreferrer">
              {language === 'ja' ? '運営者情報' : 'Operator'}
            </a>
            <a className="hover:text-cyan-400 transition-colors" href="/terms.html" target="_blank" rel="noreferrer">
              {language === 'ja' ? '利用規約' : 'Terms'}
            </a>
            <a className="hover:text-cyan-400 transition-colors" href="/privacy.html" target="_blank" rel="noreferrer">
              {language === 'ja' ? 'プライバシー' : 'Privacy'}
            </a>
            <a className="hover:text-cyan-400 transition-colors" href="/refund.html" target="_blank" rel="noreferrer">
              {language === 'ja' ? '返金ポリシー' : 'Refunds'}
            </a>
          </div>
          <p className="font-mono tabular-nums">v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'}</p>
        </footer>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <LanguageProvider>
    <AuthProvider>
      <PlatformProvider>
        <AppContent />
        <Analytics />
        <SpeedInsights />
      </PlatformProvider>
    </AuthProvider>
  </LanguageProvider>
);

export default App;
