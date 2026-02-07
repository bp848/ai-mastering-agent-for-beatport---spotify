
import React, { useState, useCallback, useEffect } from 'react';
import type { AudioAnalysisData, MasteringTarget, MasteringParams, PlatformSection } from './types';
import { analyzeAudioFile, applyMasteringAndExport } from './services/audioService';
import { getMasteringSuggestions } from './services/geminiService';
import FileUpload from './components/FileUpload';
import AnalysisDisplay from './components/AnalysisDisplay';
import MasteringAgent from './components/MasteringAgent';
import PlatformNav from './components/PlatformNav';
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

  // アップロード・分析・AI提案を一気通貫で実行
  const processTrack = useCallback(async (file: File, target: MasteringTarget) => {
    setAudioFile(file);
    setAnalysisData(null);
    setMasteringParams(null);
    setError('');
    setIsProcessing(true);
    
    try {
      addLog(t('log.audio.analysis_start'));
      const { analysisData: result, audioBuffer: buffer } = await analyzeAudioFile(file);
      setAnalysisData(result);
      setAudioBuffer(buffer);
      addLog(t('log.audio.analysis_complete'));

      // 続けてAI提案を取得
      addLog(t('log.gemini.request'));
      const params = await getMasteringSuggestions(result, target, language);
      setMasteringParams(params);
      addLog(t('log.gemini.success'));
      setShowResultsModal(true);
    } catch (err) {
      const errorKey = err instanceof Error ? err.message : 'error.audio.analysis';
      setError(t(errorKey, { default: t('error.audio.analysis') }));
    } finally {
      setIsProcessing(false);
    }
  }, [t, language, addLog]);

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
    <div className="min-h-screen min-h-[100dvh] text-zinc-300 p-3 sm:p-6 lg:p-8 pb-[env(safe-area-inset-bottom)] selection:bg-cyan-500/30">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center justify-between gap-2 mb-6 sm:mb-8 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
              <BrandIcon />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">Mastering Agent</h1>
              <span className="text-[10px] text-zinc-500">{language === 'ja' ? 'Beatport / Spotify 対応' : 'Beatport / Spotify ready'}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <PlatformNav current={section} onSelect={setSection} />
            <LanguageSwitcher />
          </div>
        </header>

        {section !== 'mastering' && (
          <main className="animate-fade-up">
            {section === 'library' && <LibraryView />}
            {section === 'checklist' && <ChecklistView />}
            {section === 'email' && <EmailView />}
            {section === 'sns' && <SNSView />}
            {section === 'mypage' && <MyPageView />}
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

          {isProcessing && (
            <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center text-center animate-fade-up">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 flex items-center justify-center mb-4 text-cyan-400">
                <Spinner />
              </div>
              <h2 className="text-lg font-bold text-white">{t('upload.analyzing')}</h2>
              <p className="text-sm text-zinc-500 mt-1">{t('upload.analyzing.detail')}</p>
            </div>
          )}

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
