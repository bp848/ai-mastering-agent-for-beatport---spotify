import React, { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import type { AudioAnalysisData, MasteringTarget, MasteringParams, PlatformSection } from './types';
import { analyzeAudioFile, applyMasteringAndExport, optimizeMasteringParams } from './services/audioService';
import { getMasteringSuggestions, isOpenAIAvailable } from './services/aiService';
import PricingView from './components/PricingView';
import { useTranslation } from './contexts/LanguageContext';
import { usePlatform } from './contexts/PlatformContext';
import { useAuth } from './contexts/AuthContext';
import LanguageSwitcher from './components/LanguageSwitcher';
import DownloadGateModal from './components/DownloadGateModal';
import PaywallModal from './components/PaywallModal';
import ResultsModal from './components/ResultsModal';
import type { ActionLog } from './components/Console';
import MyPageView from './components/MyPageView';
import { createCheckoutSession } from './services/stripeCheckout';
import { recordDownload } from './services/downloadHistory';
import { supabase } from './services/supabase';
import { trackEvent } from './services/analytics';

const LP = lazy(() => import('./components/lp/LP'));

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

export default function AppContent() {
  const [section, setSection] = useState<PlatformSection>(() => getSectionFromHash());
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [analysisData, setAnalysisData] = useState<AudioAnalysisData | null>(null);
  const [masteringParams, setMasteringParams] = useState<MasteringParams | null>(null);
  const [masterMetrics, setMasterMetrics] = useState<{ lufs: number; peakDb: number } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isMastering, setIsMastering] = useState<boolean>(false);
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

  const isProcessing = isAnalyzing || isMastering;
  const processingRef = useRef(false);
  processingRef.current = isProcessing;

  useEffect(() => {
    if (!isProcessing) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isProcessing]);

  useEffect(() => {
    const newHash = showResultsModal ? 'result' : section;
    if (typeof window !== 'undefined' && window.location.hash.slice(1).toLowerCase() !== newHash) {
      window.location.hash = newHash;
    }
  }, [section, showResultsModal]);

  useEffect(() => {
    const onHash = () => {
      const newSection = getSectionFromHash();
      if (processingRef.current && newSection !== section) {
        if (!window.confirm(t('ux.leave_while_processing'))) {
          window.location.hash = section;
          return;
        }
      }
      setSection(newSection);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [section, t]);

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
        gtag('event', 'conversion', { send_to: 'AW-952809033/5-VLCPmdq_YbEMnsqsYD', value: 1.0, currency: 'JPY', transaction_id: '' });
        sessionStorage.setItem(sentKey, '1');
      }
      if (isCheckoutSuccess) window.history.replaceState({}, '', pathname + window.location.hash);
    } catch (_) {}
  }, []);

  const addLog = useCallback((message: string) => {
    const locale = language === 'ja' ? 'ja-JP' : 'en-US';
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString(locale, { hour12: false })}] ${message}`]);
  }, [language]);

  useEffect(() => {
    async function setupPyodide() {
      try {
        setPyodideStatus(t('upload.pyodide.loading'));
        const pyodide = await (window as any).loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/' });
        (window as any).pyodide = pyodide;
        await pyodide.loadPackage('micropip');
        const micropip = pyodide.pyimport('micropip');
        await micropip.install(['numpy', 'scipy', 'pyloudnorm']);
        setPyodideStatus(t('upload.pyodide.ready'));
        addLog(t('log.pyodide.ready'));
      } catch (err) {
        setError(t('error.pyodide.init'));
        setPyodideStatus(t('upload.pyodide.error'));
      }
    }
    setupPyodide();
  }, [t, addLog]);

  const addActionLog = useCallback((phase: string, message: string, toolCall?: string, status: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const locale = language === 'ja' ? 'ja-JP' : 'en-US';
    setActionLogs(prev => [...prev, { phase, timestamp: new Date().toLocaleTimeString(locale, { hour12: false, fractionalSecondDigits: 2 }), message, toolCall, status }]);
  }, [language]);

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
      addActionLog('LUFS', language === 'ja' ? `ラウドネス計測: ${result.lufs.toFixed(2)} LUFS → 目標 ${targetLufs} まで ${lufsGap > 0 ? '+' : ''}${lufsGap.toFixed(1)} dB` : `Loudness: ${result.lufs.toFixed(2)} LUFS → ${lufsGap > 0 ? '+' : ''}${lufsGap.toFixed(1)} dB to target ${targetLufs}`, undefined, 'success');
      addActionLog('PEAK', language === 'ja' ? `トゥルーピーク: ${result.truePeak.toFixed(2)} dBTP` : `True Peak: ${result.truePeak.toFixed(2)} dBTP`, undefined, result.truePeak <= (target === 'beatport' ? -0.3 : -1.0) ? 'success' : 'warning');
      const phaseStatus = result.phaseCorrelation > 0.5 ? 'success' : result.phaseCorrelation > 0 ? 'warning' : 'error';
      addActionLog('PHASE', language === 'ja' ? `位相相関検出: ${result.phaseCorrelation.toFixed(3)}` : `Phase correlation: ${result.phaseCorrelation.toFixed(3)}`, 'Phase_Detector', phaseStatus as 'info' | 'success' | 'warning' | 'error');
      if (result.distortionPercent > 0.1) addActionLog('THD', language === 'ja' ? `歪み検出: ${result.distortionPercent.toFixed(2)}% (クリッピング疑い)` : `Distortion: ${result.distortionPercent.toFixed(2)}% (clipping suspected)`, 'THD_Analyzer', 'warning');
      addActionLog('NOISE', language === 'ja' ? `ノイズフロア: ${result.noiseFloorDb.toFixed(1)} dB` : `Noise floor: ${result.noiseFloorDb.toFixed(1)} dB`, 'Noise_Gate', result.noiseFloorDb < -80 ? 'success' : 'warning');
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
          addActionLog('EQ', language === 'ja' ? `EQ ${i + 1}: ${eq.frequency}Hz ${eq.gain_db > 0 ? '+' : ''}${eq.gain_db.toFixed(1)} dB (Q:${eq.q.toFixed(2)})` : `EQ ${i + 1}: ${eq.frequency}Hz ${eq.gain_db > 0 ? '+' : ''}${eq.gain_db.toFixed(1)} dB (Q:${eq.q.toFixed(2)})`, 'Linear_Phase_EQ', 'info');
        });
      }
      addActionLog('SIG', language === 'ja' ? `Tube: ${rawParams.tube_drive_amount.toFixed(1)} / Exciter: ${rawParams.exciter_amount.toFixed(2)} / Contour: ${rawParams.low_contour_amount.toFixed(1)} / Width: ${rawParams.width_amount.toFixed(2)}` : `Tube: ${rawParams.tube_drive_amount.toFixed(1)} / Exciter: ${rawParams.exciter_amount.toFixed(2)} / Contour: ${rawParams.low_contour_amount.toFixed(1)} / Width: ${rawParams.width_amount.toFixed(2)}`, 'Signature_Sound', 'info');
      addActionLog('LIM', language === 'ja' ? `リミッター: シーリング ${rawParams.limiter_ceiling_db.toFixed(1)} dBTP` : `Limiter: ceiling ${rawParams.limiter_ceiling_db.toFixed(1)} dBTP`, 'Brickwall_Limiter', 'info');
      const targetLufsValue = masteringTarget === 'beatport' ? -8.0 : -14.0;
      rawParams.target_lufs = targetLufsValue;
      addActionLog('CORR', language === 'ja' ? `自己補正: 目標 ${targetLufsValue} LUFS（サビ10秒シミュレーション → ゲイン自動補正）` : `Self-correction: target ${targetLufsValue} LUFS (10s simulation → gain auto-adjust)`, 'optimizeMasteringParams', 'info');
      const optimizeResult = await optimizeMasteringParams(audioBuffer, rawParams);
      const validatedParams = optimizeResult.params;
      setMasterMetrics({ lufs: optimizeResult.measuredLufs, peakDb: optimizeResult.measuredPeakDb });
      const gainDelta = validatedParams.gain_adjustment_db - rawParams.gain_adjustment_db;
      if (Math.abs(gainDelta) > 0.1) addActionLog('CORR', language === 'ja' ? `ゲイン補正: ${rawParams.gain_adjustment_db.toFixed(1)} → ${validatedParams.gain_adjustment_db.toFixed(1)} dB (Δ ${gainDelta > 0 ? '+' : ''}${gainDelta.toFixed(1)})` : `Gain corrected: ${rawParams.gain_adjustment_db.toFixed(1)} → ${validatedParams.gain_adjustment_db.toFixed(1)} dB (Δ ${gainDelta > 0 ? '+' : ''}${gainDelta.toFixed(1)})`, 'Auto_Correction', 'warning');
      else addActionLog('CORR', language === 'ja' ? '補正不要 — AI提案値がLUFS±0.5dB以内' : 'No correction needed — AI proposal within ±0.5 dB', 'Auto_Correction', 'success');
      addActionLog('NEURO', language === 'ja' ? 'Neuro-Drive Module: Parallel Hyper-Compression 起動 (Threshold: -30dB, Ratio: 12:1, Attack: 5ms)' : 'Neuro-Drive Module: Parallel Hyper-Compression active (Threshold: -30dB, Ratio: 12:1, Attack: 5ms)', 'HyperCompressor', 'info');
      addActionLog('NEURO', language === 'ja' ? 'Energy Filter: 250Hz HPF — キック/ベースの位相干渉を回避' : 'Energy Filter: 250Hz HPF — avoiding kick/bass phase interference', 'EnergyFilter', 'info');
      addActionLog('NEURO', language === 'ja' ? 'Air Exciter: 12kHz+ High-Shelf +4.0dB — 超高域の覚醒刺激' : 'Air Exciter: 12kHz+ High-Shelf +4.0dB — hyper-high frequency stimulation', 'AirExciter', 'info');
      addActionLog('NEURO', language === 'ja' ? 'Neuro Injection: Density +35% (Parallel Mix) — Hyper-Saturation Active' : 'Neuro Injection: Density +35% (Parallel Mix) — Hyper-Saturation Active', 'NeuroMix', 'success');
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

  const recalcParamsWithAI = useCallback(async () => {
    if (!analysisData || !audioBuffer) return;
    setIsMastering(true);
    setError('');
    try {
      addActionLog('AI', language === 'ja' ? 'AI再計算: OpenAI でパラメータを再取得中...' : 'Re-calculating with OpenAI...', 'getMasteringSuggestions', 'info');
      const { params: rawParams, rawResponseText } = await getMasteringSuggestions(analysisData, masteringTarget, language);
      setRawMasteringResponseText(rawResponseText);
      const targetLufsValue = masteringTarget === 'beatport' ? -8.0 : -14.0;
      rawParams.target_lufs = targetLufsValue;
      const optimizeResult = await optimizeMasteringParams(audioBuffer, rawParams);
      setMasteringParams(optimizeResult.params);
      setMasterMetrics({ lufs: optimizeResult.measuredLufs, peakDb: optimizeResult.measuredPeakDb });
      addActionLog('DONE', language === 'ja' ? 'OpenAI で再計算完了' : 'Re-calc done with OpenAI', undefined, 'success');
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
    else resetToUpload();
  }, [analyzeOnly, masteringTarget, resetToUpload]);

  const handleDownload = useCallback(async () => {
    if (!masteringParams || !audioBuffer || !audioFile) {
      setError(language === 'ja' ? 'ダウンロードの準備が完了していません。もう一度マスタリングを実行してください。' : 'The download is not ready yet. Please run mastering again.');
      return;
    }
    if (!session?.user) { setShowDownloadGate(true); return; }
    const accessToken = session.access_token;
    const base = typeof window !== 'undefined' ? window.location.origin : '';

    let entitlement: { allowed?: boolean; remaining?: number | null; admin?: boolean } = {};
    try {
      const res = await fetch(`${base}/api/check-download-entitlement`, { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } });
      entitlement = await res.json().catch(() => ({}));
      if (!res.ok || entitlement?.allowed !== true) {
        setShowPaywall(true);
        const remaining = typeof entitlement?.remaining === 'number' ? entitlement.remaining : 0;
        setError(language === 'ja' ? `ダウンロード可能回数が不足しています（残り: ${remaining}回）。` : `You do not have enough download credits (remaining: ${remaining}).`);
        return;
      }
    } catch (_) {
      setShowPaywall(true);
      setError(language === 'ja' ? 'ダウンロード権限の確認に失敗しました。しばらくしてから再試行してください。' : 'Failed to verify your download entitlement. Please try again shortly.');
      return;
    }

    try {
      const consumeRes = await fetch(`${base}/api/consume-download-token`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } });
      const consumeData = await consumeRes.json().catch(() => ({}));
      if (!consumeRes.ok || (consumeData.consumed === false && consumeData.admin !== true)) {
        setShowPaywall(true);
        const remaining = typeof consumeData?.remaining === 'number' ? consumeData.remaining : 0;
        setError(language === 'ja' ? `ダウンロード回数が足りません（残り: ${remaining}回）。` : `Not enough download credits (remaining: ${remaining}).`);
        return;
      }
    } catch (_) {
      setShowPaywall(true);
      setError(language === 'ja' ? 'ダウンロードトークンの消費に失敗しました。時間をおいて再度お試しください。' : 'Failed to consume download token. Please try again later.');
      return;
    }

    try {
      setIsExporting(true);
      const masteredBlob = await applyMasteringAndExport(audioBuffer, masteringParams);
      const baseName = audioFile.name.replace(/\.[^/.]+$/, '') || 'mastered';
      const suggestedName = `${baseName}_${masteringTarget}_mastered.wav`;
      const url = URL.createObjectURL(masteredBlob);
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = suggestedName;
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } finally {
        URL.revokeObjectURL(url);
      }
      let storagePath: string | undefined;
      try {
        const path = `${session.user.id}/${crypto.randomUUID()}.wav`;
        const { error: uploadError } = await supabase.storage.from('mastered').upload(path, masteredBlob, { contentType: 'audio/wav', upsert: false });
        if (!uploadError) storagePath = path;
      } catch (_) {}
      await recordDownload(session.user.id, audioFile.name, masteringTarget, undefined, storagePath);
      trackEvent('download', { file_name: audioFile.name, target: masteringTarget, storage_path: storagePath }, session.user.id);
      setShowResultsModal(false);
      setSection('mypage');
    } catch (e) {
      setError(t('error.download.fail'));
    } finally {
      setIsExporting(false);
    }
  }, [masteringParams, audioBuffer, audioFile, masteringTarget, t, session?.user, language]);

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
    setSection('mypage');
  }, [audioFile, masteringTarget, addTrack, saveToLibraryForm]);

  const onPerTrackSelect = useCallback(async () => {
    if (!session?.access_token) { signInWithGoogle(); return; }
    try {
      const { url } = await createCheckoutSession(session.access_token, 1000, 'Per Track', 1);
      if (url) window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
    }
  }, [session?.access_token, signInWithGoogle]);

  const onMonthlySelect = useCallback(() => setSection('pricing'), []);

  return (
    <div className="h-full min-h-0 flex flex-col bg-background text-foreground px-3 py-3 sm:px-5 sm:py-4 lg:px-10 lg:py-5 pb-[env(safe-area-inset-bottom)] selection:bg-primary/30 overflow-hidden font-sans antialiased">
      <div className="max-w-screen-2xl mx-auto w-full flex flex-col flex-1 min-h-0 overflow-hidden">
        {showPostLoginBanner && section !== 'mypage' && section !== 'pricing' && (
          <div className="mb-2 p-3 rounded-xl bg-primary/10 border border-primary/30 flex flex-wrap items-center justify-between gap-3 animate-fade-up shrink-0">
            <p className="text-sm text-primary-foreground/90">{t('flow.post_login_banner')}</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { window.location.hash = ''; setShowPostLoginBanner(false); }} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:brightness-110 transition-colors">{t('flow.post_login_cta')}</button>
              <button type="button" onClick={() => setShowPostLoginBanner(false)} className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground" aria-label={language === 'ja' ? '閉じる' : 'Dismiss'}>×</button>
            </div>
          </div>
        )}

        {section === 'mypage' && (
          <>
            <header className="shrink-0 flex items-center gap-2 mb-2 py-2 border-b border-border/50">
              <button type="button" onClick={() => { window.location.hash = ''; setSection('mastering'); }} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">← {language === 'ja' ? 'トップへ' : 'Back'}</button>
              <div className="flex-1" />
              <LanguageSwitcher />
            </header>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <MyPageView onNavigateToMastering={() => { window.location.hash = ''; setSection('mastering'); }} />
            </div>
          </>
        )}

        {section === 'pricing' && (
          <>
            <header className="shrink-0 flex items-center gap-2 mb-2 py-2 border-b border-border/50">
              <button type="button" onClick={() => { window.location.hash = ''; setSection('mastering'); }} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">← {language === 'ja' ? 'トップへ' : 'Back'}</button>
              <div className="flex-1" />
              <LanguageSwitcher />
            </header>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <PricingView />
            </div>
          </>
        )}

        {(section === 'mastering' || section === 'library' || section === 'checklist' || section === 'email' || section === 'sns' || section === 'admin') && (
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-touch">
            <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">Loading…</div>}>
              <DownloadGateModal open={showDownloadGate} onClose={() => setShowDownloadGate(false)} onSignInWithGoogle={signInWithGoogle} />
              <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} onGoToPricing={() => { window.location.hash = 'pricing'; setSection('pricing'); }} />
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
                    if (!showSaveToLibrary && audioFile) setSaveToLibraryForm((p) => ({ ...p, title: audioFile.name.replace(/\.[^/.]+$/, '') || 'Untitled' }));
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
              <LP
                language={language}
                onFileChange={handleFileChange}
                fileName={audioFile?.name}
                isAnalyzing={isAnalyzing}
                isMastering={isMastering}
                pyodideStatus={pyodideStatus}
                error={error}
                onErrorRetry={() => { setError(''); resetToUpload(); }}
                audioFile={audioFile}
                analysisData={analysisData}
                masteringParams={masteringParams}
                masteringTarget={masteringTarget}
                onTargetChange={setMasteringTarget}
                onExecuteMastering={executeMastering}
                onOpenResults={() => setShowResultsModal(true)}
                onResetUpload={resetToUpload}
                session={session}
                onMypageClick={() => { window.location.hash = 'mypage'; setSection('mypage'); }}
                onPerTrackSelect={onPerTrackSelect}
                onMonthlySelect={onMonthlySelect}
              />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}
