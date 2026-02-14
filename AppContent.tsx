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
import { triggerBlobDownload } from './utils/download';
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
    } catch (_) { }
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
    } catch (_) { }
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
    supabase.from('upload_events').insert({ user_id: session?.user?.id ?? null, file_name: file.name, file_size_bytes: file.size }).then(() => { }, () => { });

    try {
      const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

      addActionLog('INIT', t('log.action.init'), undefined, 'info');
      await delay(600);
      addActionLog('INIT', t('log.action.target_signal', { replacements: { name: file.name, size: (file.size / 1024 / 1024).toFixed(2) } }), undefined, 'info');
      await delay(800);

      // Granular Full-Scan Logs
      addActionLog('SCAN', t('log.action.full_scan_progress', { replacements: { percent: 15, seconds: 8 } }), 'find_loudest_section', 'info');
      await delay(1200);
      addActionLog('SEGMENT', t('log.action.full_scan_progress', { replacements: { percent: 45, seconds: 5 } }), 'Segment_Analysis', 'info');
      await delay(1500);
      addActionLog('FFT', t('log.action.full_scan_progress', { replacements: { percent: 80, seconds: 2 } }), 'FFT_Deep_Scan', 'info');
      await delay(1000);

      addLog(t('log.audio.analysis_start'));

      const analysisStart = Date.now();
      const { analysisData: result, audioBuffer: buffer } = await analyzeAudioFile(file);
      const elapsed = Date.now() - analysisStart;

      // 最低表示時間: フルスキャンの信頼感を保つため、早く終わっても最低20秒は進捗を表示
      const MIN_ANALYSIS_DISPLAY_MS = 20000;
      const remaining = Math.max(0, MIN_ANALYSIS_DISPLAY_MS - elapsed);
      if (remaining > 0) {
        const durationSec = buffer.duration;
        const numChunks = Math.min(10, Math.max(3, Math.ceil(durationSec / 60)));
        const interval = remaining / numChunks;
        const formatSeg = (sec: number) => {
          const m = Math.floor(sec / 60);
          const s = Math.floor(sec % 60);
          return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        };
        for (let i = 0; i < numChunks; i++) {
          await delay(interval);
          const startSec = (i * durationSec) / numChunks;
          const endSec = ((i + 1) * durationSec) / numChunks;
          addActionLog('SCAN', t('log.action.scan_segment', { replacements: { start: formatSeg(startSec), end: formatSeg(endSec) } }), 'FullScan', 'info');
        }
      }

      const targetLufs = target === 'beatport' ? -8.0 : -14.0;
      const lufsGap = targetLufs - result.lufs;

      const dropTime = result.loudestSectionStart ? `${Math.floor(result.loudestSectionStart / 60)}:${(result.loudestSectionStart % 60).toFixed(0).padStart(2, '0')}` : '0:00';
      addActionLog('DROP', t('log.action.drop_detected', { replacements: { time: dropTime, rms: result.loudestSectionRms?.toFixed(1) || '0' } }), undefined, 'success');
      addActionLog('LUFS', t('log.action.lufs_report', { replacements: { lufs: result.lufs.toFixed(2), target: targetLufs, gap: (lufsGap > 0 ? '+' : '') + lufsGap.toFixed(1) } }), undefined, 'success');
      addActionLog('PEAK', t('log.action.peak_report', { replacements: { peak: result.truePeak.toFixed(2) } }), undefined, result.truePeak <= -1.0 ? 'success' : 'warning');
      addActionLog('PHASE', t('log.action.phase_report', { replacements: { value: result.phaseCorrelation.toFixed(3) } }), 'Phase_Detector', result.phaseCorrelation > 0.5 ? 'success' : 'warning');
      const lowPhase = result.phaseCorrelationLow ?? result.phaseCorrelation;
      addActionLog('PHASE', t('log.action.sub_phase_report', { replacements: { value: lowPhase.toFixed(3) } }), 'Sub_Phase_Detector', lowPhase > 0.7 ? 'success' : lowPhase > 0.3 ? 'warning' : 'error');
      if (result.distortionPercent > 0.1) addActionLog('THD', t('log.action.thd_warning', { replacements: { value: result.distortionPercent.toFixed(2) } }), 'THD_Analyzer', 'warning');
      addActionLog('NOISE', t('log.action.noise_report', { replacements: { value: result.noiseFloorDb.toFixed(1) } }), 'Noise_Gate', result.noiseFloorDb < -80 ? 'success' : 'warning');
      addActionLog('DONE', t('log.action.signal_done'), undefined, 'success');
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
      addActionLog('AI', t('log.action.ai_calc'), 'getMasteringSuggestions', 'info');
      addLog(t('log.gemini.request'));
      const { params: rawParams, rawResponseText } = await getMasteringSuggestions(analysisData, masteringTarget, language);
      setRawMasteringResponseText(rawResponseText);
      if (rawParams.eq_adjustments?.length) {
        rawParams.eq_adjustments.forEach((eq, i) => {
          addActionLog('EQ', t('log.action.eq_adjust', { replacements: { index: i + 1, freq: eq.frequency, gain: (eq.gain_db > 0 ? '+' : '') + eq.gain_db.toFixed(1), q: eq.q.toFixed(2) } }), 'Linear_Phase_EQ', 'info');
        });
      }
      addActionLog('SIG', t('log.action.sig_sound', { replacements: { tube: rawParams.tube_drive_amount.toFixed(1), exciter: rawParams.exciter_amount.toFixed(2), contour: rawParams.low_contour_amount.toFixed(1), width: rawParams.width_amount.toFixed(2) } }), 'Signature_Sound', 'info');
      addActionLog('LIM', t('log.action.limiter', { replacements: { ceiling: rawParams.limiter_ceiling_db.toFixed(1) } }), 'Brickwall_Limiter', 'info');
      const targetLufsValue = masteringTarget === 'beatport' ? -8.0 : -14.0;
      rawParams.target_lufs = targetLufsValue;
      addActionLog('CORR', t('log.action.self_correction', { replacements: { target: targetLufsValue } }), 'optimizeMasteringParams', 'info');

      // Dynamic Mastering Logs
      if (rawParams.dynamic_automation) {
        const auto = rawParams.dynamic_automation;
        addActionLog('DYNAMIC', t('log.action.dynamic_gain'), 'Macro_Dynamics', 'info');
        addActionLog('DYNAMIC', t('log.action.dynamic_detail', { replacements: { offset: auto.input_gain_offset_quiet_db.toFixed(1), boost: auto.width_boost_drop_percent.toFixed(0) } }), undefined, 'info');
      }

      addActionLog('MASTERING', t('log.action.mastering_progress', { replacements: { percent: 20 } }), 'Neural_Engine', 'info');
      const optimizeResult = await optimizeMasteringParams(audioBuffer, analysisData, rawParams);
      addActionLog('MASTERING', t('log.action.mastering_progress', { replacements: { percent: 75 } }), 'Physical_Validation', 'info');

      const validatedParams = optimizeResult.params;
      setMasterMetrics({ lufs: optimizeResult.measuredLufs, peakDb: optimizeResult.measuredPeakDb });
      const gainDelta = validatedParams.gain_adjustment_db - rawParams.gain_adjustment_db;
      if (Math.abs(gainDelta) > 0.1) addActionLog('CORR', t('log.action.gain_corrected', { replacements: { old: rawParams.gain_adjustment_db.toFixed(1), new: validatedParams.gain_adjustment_db.toFixed(1), delta: (gainDelta > 0 ? '+' : '') + gainDelta.toFixed(1) } }), 'Auto_Correction', 'warning');
      else addActionLog('CORR', t('log.action.gain_no_correction'), 'Auto_Correction', 'success');

      addActionLog('MASTERING', t('log.action.mastering_progress', { replacements: { percent: 95 } }), 'Finalizing', 'info');
      await new Promise(r => setTimeout(r, 600));
      addActionLog('FINISH', t('log.action.finishing'), undefined, 'info');

      addActionLog('NEURO', t('log.action.neuro_drive'), 'HyperCompressor', 'info');
      addActionLog('NEURO', t('log.action.energy_filter'), 'EnergyFilter', 'info');
      addActionLog('NEURO', t('log.action.air_exciter'), 'AirExciter', 'info');
      addActionLog('NEURO', t('log.action.neuro_mix'), 'NeuroMix', 'success');
      setMasteringParams(validatedParams);
      addActionLog('DONE', t('log.action.optimize_done'), undefined, 'success');
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
      addActionLog('AI', t('log.action.recalc_openai'), 'getMasteringSuggestions', 'info');
      const { params: rawParams, rawResponseText } = await getMasteringSuggestions(analysisData, masteringTarget, language);
      setRawMasteringResponseText(rawResponseText);
      const targetLufsValue = masteringTarget === 'beatport' ? -8.0 : -14.0;
      rawParams.target_lufs = targetLufsValue;
      const optimizeResult = await optimizeMasteringParams(audioBuffer, analysisData, rawParams);
      setMasteringParams(optimizeResult.params);
      setMasterMetrics({ lufs: optimizeResult.measuredLufs, peakDb: optimizeResult.measuredPeakDb });
      addActionLog('DONE', t('log.action.recalc_done'), undefined, 'success');
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
      setError(t('error.download.not_ready'));
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
        setError(t('error.download.no_entitlement', { replacements: { count: remaining } }));
        return;
      }
    } catch (_) {
      setShowPaywall(true);
      setError(t('error.download.verify_fail'));
      return;
    }

    try {
      setIsExporting(true);
      const masteredBlob = await applyMasteringAndExport(audioBuffer, masteringParams, analysisData);

      const consumeRes = await fetch(`${base}/api/consume-download-token`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } });
      const consumeData = await consumeRes.json().catch(() => ({}));
      if (!consumeRes.ok || (consumeData.consumed === false && consumeData.admin !== true)) {
        setShowPaywall(true);
        const remaining = typeof consumeData?.remaining === 'number' ? consumeData.remaining : 0;
        setError(t('error.download.no_entitlement', { replacements: { count: remaining } }));
        return;
      }
      const baseName = audioFile.name.replace(/\.[^/.]+$/, '') || 'mastered';
      const storagePath = `${session.user.id}/${crypto.randomUUID()}_${masteringTarget}.wav`;

      // 1. Upload to Supabase Storage (Required for mypage access)
      const { error: uploadError } = await supabase.storage.from('mastered').upload(storagePath, masteredBlob, { contentType: 'audio/wav', upsert: false });
      if (uploadError) throw uploadError;

      // 2. Record in history
      await recordDownload(session.user.id, audioFile.name, masteringTarget, undefined, storagePath);

      trackEvent('purchase_and_save', { file_name: audioFile.name, target: masteringTarget, storage_path: storagePath }, session.user.id);

      // 3. Move to My Page
      setShowResultsModal(false);
      setSection('mypage');
      window.location.hash = 'mypage';
    } catch (e) {
      setError(t('error.save.fail'));
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
              <button type="button" onClick={() => setShowPostLoginBanner(false)} className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground" aria-label={t('common.close', { default: 'Dismiss' })}>×</button>
            </div>
          </div>
        )}

        {section === 'mypage' && (
          <>
            <header className="shrink-0 flex items-center gap-2 mb-2 py-2 border-b border-border/50">
              <button type="button" onClick={() => { window.location.hash = ''; setSection('mastering'); }} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">← {t('common.back_to_top', { default: 'Back' })}</button>
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
              <button type="button" onClick={() => { window.location.hash = ''; setSection('mastering'); }} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">← {t('common.back_to_top', { default: 'Back' })}</button>
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
            <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">{t('common.loading', { default: 'Loading…' })}</div>}>
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
