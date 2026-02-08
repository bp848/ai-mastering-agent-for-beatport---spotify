
import React, { useState, useCallback, useEffect } from 'react';
import type { AudioAnalysisData, MasteringTarget, MasteringParams, PlatformSection } from './types';
import { analyzeAudioFile, applyMasteringAndExport, optimizeMasteringParams } from './services/audioService';
import { getMasteringSuggestions } from './services/geminiService';
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
import ResultsModal from './components/ResultsModal';
import HeroEngine from './components/HeroEngine';
import AnalysisTerminal from './components/AnalysisTerminal';
import DiagnosisReport from './components/DiagnosisReport';
import type { ActionLog } from './components/Console';
import MyPageView from './components/MyPageView';
import { recordDownload } from './services/downloadHistory';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

const AppContent: React.FC = () => {
  const [section, setSection] = useState<PlatformSection>('mastering');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [analysisData, setAnalysisData] = useState<AudioAnalysisData | null>(null);
  const [masteringParams, setMasteringParams] = useState<MasteringParams | null>(null);
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
  const [showResultsModal, setShowResultsModal] = useState(false);
  const { t, language } = useTranslation();
  const { addTrack } = usePlatform();
  const { session, signInWithGoogle } = useAuth();

  useEffect(() => {
    if (session && showDownloadGate) setShowDownloadGate(false);
  }, [session, showDownloadGate]);

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
    setError('');
    setIsAnalyzing(true);
    setActionLogs([]);

    try {
      addActionLog('INIT', language === 'ja' ? 'タイトル情報を破棄。純粋な波形データとして読み込み開始。' : 'Discarding title metadata. Loading as pure waveform data.', undefined, 'info');
      addActionLog('INIT', language === 'ja' ? `ファイル: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)` : `File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`, undefined, 'info');
      addActionLog('FFT', language === 'ja' ? 'Python分析エンジン起動: numpy, scipy, pyloudnorm' : 'Python analysis engine: numpy, scipy, pyloudnorm', 'analyze_audio_metrics', 'info');
      addActionLog('FFT', language === 'ja' ? '周波数スペクトル解析 (FFT)...' : 'Analyzing Frequency Spectrum (FFT)...', 'FFT_Analysis', 'info');

      addLog(t('log.audio.analysis_start'));
      const { analysisData: result, audioBuffer: buffer } = await analyzeAudioFile(file);

      const targetLufs = target === 'beatport' ? -7.0 : -14.0;
      const lufsGap = targetLufs - result.lufs;
      addActionLog('LUFS', language === 'ja'
        ? `ラウドネス計測: ${result.lufs.toFixed(2)} LUFS → 目標 ${targetLufs} まで ${lufsGap > 0 ? '+' : ''}${lufsGap.toFixed(1)} dB`
        : `Loudness: ${result.lufs.toFixed(2)} LUFS → ${lufsGap > 0 ? '+' : ''}${lufsGap.toFixed(1)} dB to target ${targetLufs}`, undefined, 'success');

      addActionLog('PEAK', language === 'ja'
        ? `トゥルーピーク: ${result.truePeak.toFixed(2)} dBTP`
        : `True Peak: ${result.truePeak.toFixed(2)} dBTP`, undefined, result.truePeak <= -0.1 ? 'success' : 'warning');

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
      addLog(t('log.audio.analysis_complete'));
    } catch (err) {
      const errorKey = err instanceof Error ? err.message : 'error.audio.analysis';
      addActionLog('ERROR', t(errorKey, { default: t('error.audio.analysis') }), undefined, 'error');
      setError(t(errorKey, { default: t('error.audio.analysis') }));
    } finally {
      setIsAnalyzing(false);
    }
  }, [t, language, addLog, addActionLog]);

  // ── Phase 3-4: AIマスタリング実行（ユーザーが Execute ボタンを押した後）──
  const executeMastering = useCallback(async () => {
    if (!analysisData || !audioBuffer) return;
    setIsMastering(true);
    setError('');

    try {
      addActionLog('AI', language === 'ja' ? 'AIエージェント: Beatport top基準への最適化パラメータ算出中...' : 'AI Agent: Calculating optimization parameters...', 'getMasteringSuggestions', 'info');
      addLog(t('log.gemini.request'));

      const rawParams = await getMasteringSuggestions(analysisData, masteringTarget, language);

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

      const validatedParams = await optimizeMasteringParams(audioBuffer, rawParams);

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

  const handleFileChange = useCallback((file: File | null) => {
    if (file) analyzeOnly(file, masteringTarget);
  }, [analyzeOnly, masteringTarget]);

  const handleDownload = useCallback(async () => {
    if (!masteringParams || !audioBuffer || !audioFile) return;
    if (!session?.user) {
      setShowDownloadGate(true);
      return;
    }
    try {
      setIsExporting(true);
      const masteredBlob = await applyMasteringAndExport(audioBuffer, masteringParams);
      const url = URL.createObjectURL(masteredBlob);
      const fileName = `${audioFile.name.replace(/\.[^/.]+$/, "")}_${masteringTarget}_mastered.wav`;
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      await recordDownload(session.user.id, audioFile.name, masteringTarget);
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

  const handleNextTrack = useCallback(() => {
    setAudioFile(null);
    setAudioBuffer(null);
    setAnalysisData(null);
    setMasteringParams(null);
    setError('');
    setActionLogs([]);
    setShowResultsModal(false);
    setSection('mastering');
  }, []);

  // ── 4ステップ: Upload → Diagnosis → Execute → Preview ──
  const isProcessing = isAnalyzing || isMastering;
  const step = !audioFile ? 1 : isAnalyzing ? 2 : (!masteringParams && analysisData) ? 3 : masteringParams ? 4 : 2;
  const stepLabels = [
    language === 'ja' ? 'アップロード' : 'Upload',
    language === 'ja' ? '分析' : 'Analysis',
    language === 'ja' ? '診断' : 'Diagnosis',
    language === 'ja' ? 'プレビュー' : 'Preview',
  ];

  return (
    <div className="min-h-screen min-h-[100dvh] text-zinc-300 px-3 py-4 sm:px-5 sm:py-6 lg:px-10 lg:py-8 pb-[env(safe-area-inset-bottom)] selection:bg-cyan-500/30">
      <div className="max-w-screen-2xl mx-auto w-full">
        <header className="flex items-center justify-between gap-2 mb-6 sm:mb-8 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
              <BrandIcon />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">Mastering Agent</h1>
              <span className="text-[10px] text-zinc-500">{language === 'ja' ? 'Beatport top を目指す・忖度なしの解析' : 'Beatport top · no-deference analysis'}</span>
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
            <LanguageSwitcher />
          </div>
        </header>

        {section !== 'mastering' && (
          <main className="animate-fade-up">
            {section === 'pricing' && <PricingView />}
            {section === 'mypage' && <MyPageView />}
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
            onNextTrack={handleNextTrack}
            onFeedbackApply={setMasteringParams}
          />
        )}

        {section === 'mastering' && (
        <main className="space-y-4 sm:space-y-6">
          {/* ── Step Indicator (4 steps) ── */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-3 py-2 flex-wrap">
            {[1, 2, 3, 4].map((s) => (
              <React.Fragment key={s}>
                <div className="flex items-center gap-1.5">
                  <div className={`step-dot ${step > s ? 'done' : step === s ? 'active' : 'pending'}`} />
                  <span className={`text-[10px] sm:text-xs font-medium ${step >= s ? 'text-white' : 'text-zinc-600'}`}>{stepLabels[s - 1]}</span>
                </div>
                {s < 4 && <div className="w-4 sm:w-6 h-px bg-white/10" />}
              </React.Fragment>
            ))}
          </div>

          {/* ── Upload Area ── */}
          <div className="glass rounded-2xl p-4 sm:p-8">
            <FileUpload
              onFileChange={handleFileChange}
              fileName={audioFile?.name}
              isAnalyzing={isProcessing}
              pyodideStatus={pyodideStatus}
            />
            {error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* ── Phase: Processing (Terminal Logs) ── */}
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
              isMastering={isMastering}
              language={language}
            />
          )}

          {/* ── Phase: Mastering Complete → View Results ── */}
          {!isProcessing && analysisData && masteringParams && (
            <div className="glass rounded-2xl p-6 animate-fade-up text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">
                  {language === 'ja' ? 'マスタリング完了' : 'Mastering Complete'}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {language === 'ja' ? 'プレビューと A/B 比較、ダウンロードが可能です。' : 'Preview, A/B comparison, and download are ready.'}
              </p>
              <button
                type="button"
                onClick={() => setShowResultsModal(true)}
                className="px-8 py-3 min-h-[48px] rounded-xl bg-cyan-500 text-black font-bold text-sm hover:bg-cyan-400 active:scale-[0.98] touch-manipulation"
              >
                {language === 'ja' ? 'プレビュー & ダウンロード' : 'Preview & Download'}
              </button>
            </div>
          )}

          {/* ── Phase: Idle (Hero Engine) ── */}
          {!audioFile && !isProcessing && (
            <HeroEngine language={language} />
          )}
        </main>
        )}

        <footer className="mt-8 sm:mt-12 py-4 sm:py-6 border-t border-white/5 flex justify-between items-center text-[10px] text-zinc-600 flex-wrap gap-2">
          <p>{t('footer.copyright', { replacements: { year: new Date().getFullYear() } })}</p>
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
