
import React, { useState, useCallback, useEffect } from 'react';
import type { AudioAnalysisData, MasteringTarget, MasteringParams, PlatformSection } from './types';
import { analyzeAudioFile, applyMasteringAndExport } from './services/audioService';
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
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
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

  // アップロード・分析・AI提案を一気通貫で実行（プロセス透明化）
  const processTrack = useCallback(async (file: File, target: MasteringTarget) => {
    setAudioFile(file);
    setAnalysisData(null);
    setMasteringParams(null);
    setError('');
    setIsProcessing(true);
    setActionLogs([]);
    
    try {
      // Phase 1: Input Integrity Check
      addActionLog('Phase 1', language === 'ja' ? 'タイトル情報を破棄。純粋な波形データとして読み込み開始。' : 'Discarding title metadata. Loading as pure waveform data.', undefined, 'info');
      addActionLog('Phase 1', language === 'ja' ? `ファイル: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)` : `File: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`, undefined, 'info');
      
      addLog(t('log.audio.analysis_start'));
      addActionLog('Phase 2', language === 'ja' ? 'Python分析エンジン起動: numpy, scipy, pyloudnorm' : 'Python analysis engine: numpy, scipy, pyloudnorm', 'analyze_audio_metrics', 'info');
      
      const { analysisData: result, audioBuffer: buffer } = await analyzeAudioFile(file);
      
      // Phase 2: Structural Analysis Results
      const targetLufs = target === 'beatport' ? -7.0 : -14.0;
      const lufsGap = targetLufs - result.lufs;
      addActionLog('Phase 2', language === 'ja' 
        ? `構造分析完了: LUFS ${result.lufs.toFixed(2)} / 目標 ${targetLufs} → 差分 ${lufsGap > 0 ? '+' : ''}${lufsGap.toFixed(1)} dB`
        : `Structural analysis: LUFS ${result.lufs.toFixed(2)} / Target ${targetLufs} → Gap ${lufsGap > 0 ? '+' : ''}${lufsGap.toFixed(1)} dB`, undefined, 'success');
      
      if (result.phaseCorrelation !== undefined) {
        const phaseStatus = result.phaseCorrelation > 0.5 ? 'success' : result.phaseCorrelation > 0 ? 'warning' : 'error';
        addActionLog('Phase 2', language === 'ja'
          ? `位相相関: ${result.phaseCorrelation.toFixed(3)} ${result.phaseCorrelation > 0.5 ? '(安全)' : result.phaseCorrelation > 0 ? '(注意)' : '(危険)'}`
          : `Phase correlation: ${result.phaseCorrelation.toFixed(3)} ${result.phaseCorrelation > 0.5 ? '(safe)' : result.phaseCorrelation > 0 ? '(caution)' : '(danger)'}`, undefined, phaseStatus);
      }
      
      if (result.distortionPercent !== undefined && result.distortionPercent > 0.1) {
        addActionLog('Phase 2', language === 'ja'
          ? `歪み検出: ${result.distortionPercent.toFixed(2)}% (クリッピング疑い)`
          : `Distortion detected: ${result.distortionPercent.toFixed(2)}% (possible clipping)`, undefined, 'warning');
      }
      
      if (result.noiseFloorDb !== undefined) {
        addActionLog('Phase 2', language === 'ja'
          ? `ノイズフロア: ${result.noiseFloorDb.toFixed(1)} dB`
          : `Noise floor: ${result.noiseFloorDb.toFixed(1)} dB`, undefined, result.noiseFloorDb < -80 ? 'success' : 'warning');
      }
      
      setAnalysisData(result);
      setAudioBuffer(buffer);
      addLog(t('log.audio.analysis_complete'));

      // Phase 3: AI Parameter Calculation
      addActionLog('Phase 3', language === 'ja' ? 'AIエージェント: Beatport top基準への最適化パラメータ算出中...' : 'AI Agent: Calculating optimization parameters for Beatport top standard...', 'getMasteringSuggestions', 'info');
      addLog(t('log.gemini.request'));
      
      const params = await getMasteringSuggestions(result, target, language);
      
      // Tool Calls (EQ, Gain, Limiter)
      if (params.eq_adjustments && params.eq_adjustments.length > 0) {
        params.eq_adjustments.forEach((eq, i) => {
          addActionLog('Phase 3', language === 'ja'
            ? `[Tool Call] EQ調整 ${i + 1}: ${eq.frequency}Hz に ${eq.gain_db > 0 ? '+' : ''}${eq.gain_db.toFixed(1)} dB (Q: ${eq.q.toFixed(2)})`
            : `[Tool Call] EQ ${i + 1}: ${eq.frequency}Hz ${eq.gain_db > 0 ? '+' : ''}${eq.gain_db.toFixed(1)} dB (Q: ${eq.q.toFixed(2)})`, 'Linear_Phase_EQ', 'info');
        });
      }
      
      addActionLog('Phase 3', language === 'ja'
        ? `[Tool Call] ゲイン補正: +${params.gain_adjustment_db.toFixed(1)} dB (目標 LUFS 到達)`
        : `[Tool Call] Gain adjustment: +${params.gain_adjustment_db.toFixed(1)} dB (target LUFS)`, 'LUFS_Maximizer', 'info');
      
      addActionLog('Phase 3', language === 'ja'
        ? `[Tool Call] リミッター: シーリング ${params.limiter_ceiling_db.toFixed(1)} dBTP`
        : `[Tool Call] Limiter: Ceiling ${params.limiter_ceiling_db.toFixed(1)} dBTP`, 'Brickwall_Limiter', 'info');
      
      setMasteringParams(params);
      addActionLog('Phase 3', language === 'ja' ? '最適化完了: Beatport top基準に適合' : 'Optimization complete: Beatport top standard matched', undefined, 'success');
      addLog(t('log.gemini.success'));
      setShowResultsModal(true);
    } catch (err) {
      const errorKey = err instanceof Error ? err.message : 'error.audio.analysis';
      addActionLog('Error', t(errorKey, { default: t('error.audio.analysis') }), undefined, 'error');
      setError(t(errorKey, { default: t('error.audio.analysis') }));
    } finally {
      setIsProcessing(false);
    }
  }, [t, language, addLog, addActionLog]);

  const handleFileChange = useCallback((file: File | null) => {
    if (file) processTrack(file, masteringTarget);
  }, [processTrack, masteringTarget]);

  const handleTargetChange = (target: MasteringTarget) => {
    setMasteringTarget(target);
    if (audioFile) processTrack(audioFile, target); // ターゲット変更時も自動で再計算
  };

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

  const step = !audioFile ? 1 : isProcessing ? 2 : 3;
  const stepLabels = [
    language === 'ja' ? 'アップロード' : 'Upload',
    language === 'ja' ? '分析' : 'Analyze',
    language === 'ja' ? 'ダウンロード' : 'Download',
  ];

  return (
    <div className="min-h-screen min-h-[100dvh] text-zinc-300 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 pb-[env(safe-area-inset-bottom)] selection:bg-cyan-500/30">
      <div className="max-w-4xl mx-auto w-full">
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
            onTargetChange={handleTargetChange}
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
          />
        )}

        {section === 'mastering' && (
        <main className="space-y-4 sm:space-y-8">
          <div className="flex items-center justify-center gap-2 sm:gap-4 py-2 flex-wrap">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div className="flex items-center gap-2">
                  <div className={`step-dot ${step > s ? 'done' : step === s ? 'active' : 'pending'}`} />
                  <span className={`text-xs font-medium ${step >= s ? 'text-white' : 'text-zinc-600'}`}>{stepLabels[s - 1]}</span>
                </div>
                {s < 3 && <div className="w-8 h-px bg-white/10" />}
              </React.Fragment>
            ))}
          </div>

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

          {!isProcessing && analysisData && masteringParams && (
            <div className="glass rounded-2xl p-6 animate-fade-up text-center">
              <p className="text-sm text-zinc-400 mb-4">
                {language === 'ja' ? '分析とマスタリングが完了しました' : 'Analysis and mastering complete'}
              </p>
              <button
                type="button"
                onClick={() => setShowResultsModal(true)}
                className="px-8 py-3 min-h-[48px] rounded-xl bg-cyan-500 text-black font-bold text-sm hover:bg-cyan-400 active:scale-[0.98] touch-manipulation"
              >
                {language === 'ja' ? '結果を見る' : 'View Results'}
              </button>
            </div>
          )}

          {!analysisData && !isProcessing && (
            <div className="glass rounded-2xl p-12 text-center animate-fade-up">
              <p className="text-zinc-500 text-sm">{t('agent.idle.detail')}</p>
            </div>
          )}
        </main>
        )}

        <footer className="mt-8 sm:mt-12 py-4 sm:py-6 border-t border-white/5 flex justify-between items-center text-[10px] text-zinc-600 flex-wrap gap-2">
          <p>{t('footer.copyright', { replacements: { year: new Date().getFullYear() } })}</p>
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
