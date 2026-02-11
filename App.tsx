
import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  const uploadRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    async function setupPyodide() {
      try {
        setPyodideStatus(t('upload.pyodide.loading'));
        const pyodide = await (window as any).loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/"
        });
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

  const executeMastering = useCallback(async () => {
    if (!analysisData || !audioBuffer) return;
    setIsMastering(true);
    setError('');

    try {
      addActionLog('AI', language === 'ja' ? 'AIエージェント: 最適化パラメータ算出中...' : 'AI Agent: Calculating optimization parameters...', 'getMasteringSuggestions', 'info');
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

      const targetLufsValue = masteringTarget === 'beatport' ? -8.0 : -14.0;
      rawParams.target_lufs = targetLufsValue;

      addActionLog('CORR', language === 'ja'
        ? `自己補正: 目標 ${targetLufsValue} LUFS`
        : `Self-correction: target ${targetLufsValue} LUFS`, 'optimizeMasteringParams', 'info');

      const optimizeResult = await optimizeMasteringParams(audioBuffer, rawParams);
      const validatedParams = optimizeResult.params;

      setMasterMetrics({ lufs: optimizeResult.measuredLufs, peakDb: optimizeResult.measuredPeakDb });

      const gainDelta = validatedParams.gain_adjustment_db - rawParams.gain_adjustment_db;
      if (Math.abs(gainDelta) > 0.1) {
        addActionLog('CORR', language === 'ja'
          ? `ゲイン補正: ${rawParams.gain_adjustment_db.toFixed(1)} → ${validatedParams.gain_adjustment_db.toFixed(1)} dB`
          : `Gain corrected: ${rawParams.gain_adjustment_db.toFixed(1)} → ${validatedParams.gain_adjustment_db.toFixed(1)} dB`, 'Auto_Correction', 'warning');
      } else {
        addActionLog('CORR', language === 'ja' ? '補正不要' : 'No correction needed', 'Auto_Correction', 'success');
      }

      addActionLog('NEURO', language === 'ja'
        ? 'Neuro-Drive Module: Parallel Hyper-Compression'
        : 'Neuro-Drive Module: Parallel Hyper-Compression active', 'HyperCompressor', 'info');
      addActionLog('NEURO', language === 'ja'
        ? 'Air Exciter: 12kHz+ High-Shelf +4.0dB'
        : 'Air Exciter: 12kHz+ High-Shelf +4.0dB', 'AirExciter', 'info');
      addActionLog('NEURO', language === 'ja'
        ? 'Neuro Injection: Density +35% — Hyper-Saturation Active'
        : 'Neuro Injection: Density +35% — Hyper-Saturation Active', 'NeuroMix', 'success');

      setMasteringParams(validatedParams);
      addActionLog('DONE', language === 'ja' ? '最適化完了' : 'Optimization complete', undefined, 'success');
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
      addActionLog('AI', language === 'ja' ? 'AI再計算中...' : 'Re-calculating...', 'getMasteringSuggestions', 'info');
      const { params: rawParams, rawResponseText } = await getMasteringSuggestions(analysisData, masteringTarget, language);
      setRawMasteringResponseText(rawResponseText);
      const targetLufsValue = masteringTarget === 'beatport' ? -8.0 : -14.0;
      rawParams.target_lufs = targetLufsValue;
      const optimizeResult = await optimizeMasteringParams(audioBuffer, rawParams);
      setMasteringParams(optimizeResult.params);
      setMasterMetrics({ lufs: optimizeResult.measuredLufs, peakDb: optimizeResult.measuredPeakDb });
      addActionLog('DONE', language === 'ja' ? '再計算完了' : 'Re-calc done', undefined, 'success');
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

  const scrollToUpload = useCallback(() => {
    uploadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  return (
    <div className="min-h-screen min-h-[100dvh] text-foreground px-4 py-4 sm:px-6 sm:py-6 lg:px-12 lg:py-8 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-screen-xl mx-auto w-full">
        {/* Post-login banner */}
        {showPostLoginBanner && (
          <div className="mb-4 p-4 rounded-xl border border-primary/30 flex flex-wrap items-center justify-between gap-3 animate-fade-up" style={{ background: 'rgba(34,211,238,0.05)' }}>
            <p className="text-sm text-primary">{t('flow.post_login_banner')}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setSection('mastering'); setShowPostLoginBanner(false); }}
                className="btn-primary text-sm px-4 py-2 min-h-[40px]"
              >
                {t('flow.post_login_cta')}
              </button>
              <button
                type="button"
                onClick={() => setShowPostLoginBanner(false)}
                className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
                aria-label={language === 'ja' ? '閉じる' : 'Dismiss'}
              >
                {'x'}
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <header className="flex items-center justify-between gap-3 mb-8 sm:mb-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <BrandIcon />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-foreground tracking-tight">{t('header.title')}</h1>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                {language === 'ja' ? 'Beatport / Spotify 配信基準 AI マスタリング' : 'AI Mastering for Beatport / Spotify'}
              </span>
            </div>
            <div className="shrink-0 ml-2">
              <LanguageSwitcher />
            </div>
          </div>
          <PlatformNav
            current={section}
            onSelect={setSection}
            session={session}
            onLoginClick={() => {
              if (session?.user) setSection('mypage');
              else signInWithGoogle();
            }}
          />
        </header>

        {/* Non-mastering sections */}
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

        {/* Modals */}
        <DownloadGateModal open={showDownloadGate} onClose={() => setShowDownloadGate(false)} onSignInWithGoogle={signInWithGoogle} />
        <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} onGoToPricing={() => setSection('pricing')} />

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

        {/* Mastering section */}
        {section === 'mastering' && (
        <main className="space-y-6 sm:space-y-8">
          {/* Step Indicator */}
          <div
            className="flex items-center justify-center gap-2 sm:gap-4 py-3"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={4}
            aria-label={language === 'ja' ? `ステップ ${step} / 4` : `Step ${step} of 4`}
          >
            {[1, 2, 3, 4].map((s) => (
              <React.Fragment key={s}>
                <div className="flex items-center gap-1.5">
                  <div className={`step-dot ${step > s ? 'done' : step === s ? 'active' : 'pending'}`} />
                  <span className={`text-[11px] sm:text-xs font-medium ${
                    step === s ? 'text-primary font-bold' : step > s ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {stepLabels[s - 1]}
                  </span>
                </div>
                {s < 4 && <div className="w-4 sm:w-8 h-px bg-border" />}
              </React.Fragment>
            ))}
          </div>

          {/* Upload / Hero area */}
          {(!analysisData || masteringParams) && (
            <>
              {!audioFile && !isProcessing ? (
                <>
                  {/* Hero + Upload side by side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <HeroEngine language={language} compact onScrollToUpload={scrollToUpload} />
                    <div ref={uploadRef} className="rounded-2xl border border-border p-5 sm:p-6" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <p className="text-sm font-medium text-muted-foreground mb-3">
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
                        <div className="mt-4 p-4 rounded-xl border border-destructive/30 text-destructive text-sm space-y-3" style={{ background: 'rgba(239,68,68,0.05)' }}>
                          <p>{error}</p>
                          <button
                            type="button"
                            onClick={() => { setError(''); resetToUpload(); }}
                            className="btn-secondary text-sm"
                          >
                            {t('ux.error_retry')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Full Hero below */}
                  <HeroEngine language={language} onScrollToUpload={scrollToUpload} />
                </>
              ) : (
                <div className="rounded-2xl border border-border p-5 sm:p-6" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <FileUpload
                    onFileChange={handleFileChange}
                    fileName={audioFile?.name}
                    isAnalyzing={isProcessing}
                    pyodideStatus={pyodideStatus}
                    compact={!!(audioFile || isProcessing)}
                  />
                  {error && (
                    <div className="mt-4 p-4 rounded-xl border border-destructive/30 text-destructive text-sm space-y-3" style={{ background: 'rgba(239,68,68,0.05)' }}>
                      <p>{error}</p>
                      <button
                        type="button"
                        onClick={() => { setError(''); resetToUpload(); }}
                        className="btn-secondary text-sm"
                      >
                        {t('ux.error_retry')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Processing state */}
          {isAnalyzing && <StatusLoader mode="analysis" />}
          {isMastering && <StatusLoader mode="mastering" />}
          {isProcessing && actionLogs.length > 0 && (
            <AnalysisTerminal
              logs={actionLogs}
              title={isMastering ? 'MASTERING_ENGINE' : 'ANALYSIS_ENGINE'}
            />
          )}

          {/* Diagnosis (analysis done, mastering not yet run) */}
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

          {/* Mastering Complete */}
          {!isProcessing && analysisData && masteringParams && (
            <div className="rounded-2xl border border-border p-8 sm:p-10 animate-fade-up text-center space-y-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/30">
                <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-bold text-success uppercase tracking-wider">
                  {language === 'ja' ? 'Mastering Complete' : 'Mastering Complete'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">
                {language === 'ja' ? '仕上がりを聴いてからダウンロード' : 'Listen, then download'}
              </h2>
              {masterMetrics && (
                <p className="text-sm text-muted-foreground font-mono tabular-nums">
                  LUFS {masterMetrics.lufs.toFixed(1)} / Target {masteringTarget === 'beatport' ? '-8.0' : '-14.0'}
                </p>
              )}
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {t('flow.complete_teaser')}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setShowResultsModal(true)}
                  className="btn-primary text-base px-8 py-4"
                >
                  {language === 'ja' ? '結果を見る（試聴・購入）' : 'View Results (Listen & Get)'}
                </button>
                <button
                  type="button"
                  onClick={resetToUpload}
                  className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  {t('ux.choose_other_file')}
                </button>
              </div>
            </div>
          )}
        </main>
        )}

        {/* Footer */}
        <footer className="mt-12 sm:mt-16 py-6 section-divider flex justify-between items-center text-[10px] text-muted-foreground flex-wrap gap-3">
          <p>{t('footer.copyright', { replacements: { year: new Date().getFullYear() } })}</p>
          <div className="flex items-center gap-4 flex-wrap">
            <a className="hover:text-primary transition-colors" href={language === 'ja' ? '/operator.html' : '/operator-en.html'} target="_blank" rel="noreferrer">
              {language === 'ja' ? '運営者情報' : 'Operator'}
            </a>
            <a className="hover:text-primary transition-colors" href="/terms.html" target="_blank" rel="noreferrer">
              {language === 'ja' ? '利用規約' : 'Terms'}
            </a>
            <a className="hover:text-primary transition-colors" href="/privacy.html" target="_blank" rel="noreferrer">
              {language === 'ja' ? 'プライバシー' : 'Privacy'}
            </a>
            <a className="hover:text-primary transition-colors" href="/refund.html" target="_blank" rel="noreferrer">
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
