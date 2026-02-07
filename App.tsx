
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
import Console from './components/Console';
import { LanguageProvider, useTranslation } from './contexts/LanguageContext';
import { PlatformProvider, usePlatform } from './contexts/PlatformContext';
import LanguageSwitcher from './components/LanguageSwitcher';

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
  const { t, language } = useTranslation();
  const { addTrack } = usePlatform();

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
    try {
      setIsExporting(true);
      const masteredBlob = await applyMasteringAndExport(audioBuffer, masteringParams);
      const url = URL.createObjectURL(masteredBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${audioFile.name.replace(/\.[^/.]+$/, "")}_${masteringTarget}_mastered.wav`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(t('error.download.fail'));
    } finally {
      setIsExporting(false);
    }
  }, [masteringParams, audioBuffer, audioFile, masteringTarget, t]);

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
    setSection('library');
  }, [audioFile, masteringTarget, addTrack, saveToLibraryForm]);

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-gray-300 font-sans p-4 sm:p-6 lg:p-10 selection:bg-emerald-500/30">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <BrandIcon />
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-white uppercase tracking-tighter leading-none">Mastering Agent</h1>
              <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.3em] mt-1">Techno / Trance Edition · 楽曲管理</span>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <PlatformNav current={section} onSelect={setSection} />
            <LanguageSwitcher />
          </div>
        </header>

        {section !== 'mastering' && (
          <main className="animate-in fade-in duration-300">
            {section === 'library' && <LibraryView />}
            {section === 'checklist' && <ChecklistView />}
            {section === 'email' && <EmailView />}
            {section === 'sns' && <SNSView />}
          </main>
        )}

        {section === 'mastering' && (
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Upload & Main Info */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#141414] p-6 rounded-2xl border border-white/5 shadow-2xl">
              <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">{t('section.step1.title')}</h2>
              <FileUpload 
                onFileChange={handleFileChange} 
                fileName={audioFile?.name} 
                isAnalyzing={isProcessing}
                pyodideStatus={pyodideStatus}
              />
              {error && (
                <div className="mt-4 p-3 bg-red-950/20 border border-red-900/50 rounded-lg text-red-400 text-xs font-bold animate-pulse">
                  {error}
                </div>
              )}
            </div>

            <Console logs={logs} />
          </div>

          {/* Right Column: Results & Mastering Dashboard */}
          <div className="lg:col-span-8">
            {!analysisData && !isProcessing ? (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-[#141414]/50 border-2 border-dashed border-white/5 rounded-3xl text-center p-10">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
                  <BrandIcon />
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-widest">{t('agent.idle.title')}</h2>
                <p className="text-sm text-gray-500 mt-4 max-w-xs">{t('agent.idle.detail')}</p>
              </div>
            ) : isProcessing ? (
               <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-[#141414] rounded-3xl text-center p-10 border border-white/5">
                <div className="w-12 h-12 mb-6 text-emerald-500"><Spinner /></div>
                <h2 className="text-lg font-black text-white uppercase tracking-widest">{t('upload.analyzing')}</h2>
                <p className="text-xs text-gray-500 mt-2 font-bold uppercase tracking-widest">{t('upload.analyzing.detail')}</p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
                <div className="bg-[#141414] p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl">
                   <AnalysisDisplay 
                    data={analysisData!} 
                    isLoading={isProcessing}
                    masteringTarget={masteringTarget}
                    onTargetChange={handleTargetChange}
                  />
                  
                  <div className="mt-10 pt-10 border-t border-white/5">
                    <MasteringAgent 
                      params={masteringParams}
                      isLoading={isProcessing} 
                      error={error} 
                      hasAnalysis={true}
                      onDownloadMastered={handleDownload}
                      isProcessingAudio={isExporting}
                      audioBuffer={audioBuffer}
                    />
                    {analysisData && audioFile && (
                      <div className="mt-6 pt-6 border-t border-white/5">
                        <button
                          type="button"
                          onClick={openSaveToLibrary}
                          className="text-sm font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-wider"
                        >
                          + この曲をライブラリに保存
                        </button>
                        {showSaveToLibrary && (
                          <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                            <p className="text-[10px] text-gray-500 uppercase">メタ情報（ディストリビューター用にコピーできます）</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] text-gray-500">タイトル</label>
                                <input value={saveToLibraryForm.title} onChange={(e) => setSaveToLibraryForm((p) => ({ ...p, title: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" placeholder="タイトル" />
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-500">アーティスト</label>
                                <input value={saveToLibraryForm.artist} onChange={(e) => setSaveToLibraryForm((p) => ({ ...p, artist: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" placeholder="アーティスト" />
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-500">アルバム</label>
                                <input value={saveToLibraryForm.album} onChange={(e) => setSaveToLibraryForm((p) => ({ ...p, album: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" placeholder="アルバム" />
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-500">ジャンル</label>
                                <input value={saveToLibraryForm.genre} onChange={(e) => setSaveToLibraryForm((p) => ({ ...p, genre: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" placeholder="Techno" />
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-500">ISRC</label>
                                <input value={saveToLibraryForm.isrc} onChange={(e) => setSaveToLibraryForm((p) => ({ ...p, isrc: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" placeholder="ISRC" />
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-500">リリース日</label>
                                <input value={saveToLibraryForm.releaseDate} onChange={(e) => setSaveToLibraryForm((p) => ({ ...p, releaseDate: e.target.value }))} className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" placeholder="2025-01-01" />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button type="button" onClick={handleSaveToLibrary} className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold uppercase hover:bg-emerald-600">保存してライブラリへ</button>
                              <button type="button" onClick={() => setShowSaveToLibrary(false)} className="px-4 py-2 rounded-xl bg-white/10 text-gray-400 text-xs font-bold uppercase hover:bg-white/20">キャンセル</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
        )}

        <footer className="mt-16 py-8 border-t border-white/5 flex justify-between items-center text-[10px] text-gray-600 font-bold uppercase tracking-widest">
          <p>{t('footer.copyright', { replacements: { year: new Date().getFullYear() } })}</p>
          <p>Version 2.0 (High-Speed Engine)</p>
        </footer>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <LanguageProvider>
    <PlatformProvider>
      <AppContent />
    </PlatformProvider>
  </LanguageProvider>
);

export default App;
