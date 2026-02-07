import React from 'react';
import type { AudioAnalysisData, MasteringTarget, MasteringParams } from '../types';
import AnalysisDisplay from './AnalysisDisplay';
import MasteringAgent from './MasteringAgent';
import { useTranslation } from '../contexts/LanguageContext';

interface ResultsModalProps {
  open: boolean;
  onClose: () => void;
  analysisData: AudioAnalysisData;
  masteringParams: MasteringParams;
  masteringTarget: MasteringTarget;
  onTargetChange: (t: MasteringTarget) => void;
  onDownloadMastered: () => void;
  isProcessingAudio: boolean;
  audioBuffer: AudioBuffer | null;
  audioFile: { name: string } | null;
  onSaveToLibrary: () => void;
  saveToLibraryForm: { title: string; artist: string };
  onSaveFormChange: (k: string, v: string) => void;
  showSaveToLibrary: boolean;
  onToggleSaveToLibrary: () => void;
  language: 'ja' | 'en';
}

export default function ResultsModal({
  open,
  onClose,
  analysisData,
  masteringParams,
  masteringTarget,
  onTargetChange,
  onDownloadMastered,
  isProcessingAudio,
  audioBuffer,
  audioFile,
  onSaveToLibrary,
  saveToLibraryForm,
  onSaveFormChange,
  showSaveToLibrary,
  onToggleSaveToLibrary,
  language,
}: ResultsModalProps) {
  const { t } = useTranslation();
  const [slide, setSlide] = React.useState(0);
  const totalSlides = 2;

  React.useEffect(() => {
    if (open) setSlide(0);
  }, [open]);

  if (!open) return null;

  const nextLabel = language === 'ja' ? '次へ' : 'Next';
  const prevLabel = language === 'ja' ? '前へ' : 'Back';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm safe-area-padding"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl overflow-hidden flex flex-col sm:rounded-2xl rounded-none glass shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* スライドインジケーター */}
        <div className="flex items-center justify-center gap-2 py-3 border-b border-white/5 pt-[max(0.75rem,env(safe-area-inset-top))]">
          {[0, 1].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSlide(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${slide === i ? 'bg-cyan-500 scale-125' : 'bg-white/30 hover:bg-white/50'}`}
              aria-label={i === 0 ? 'Analysis' : 'Preview'}
            />
          ))}
        </div>

        {/* スライド内容 */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 scroll-touch">
          {slide === 0 && (
            <div className="animate-fade-up">
              <h3 className="text-sm font-bold text-cyan-400 mb-4">
                {language === 'ja' ? '1. 分析結果' : '1. Analysis'}
              </h3>
              <AnalysisDisplay
                data={analysisData}
                isLoading={false}
                masteringTarget={masteringTarget}
                onTargetChange={onTargetChange}
              />
            </div>
          )}
          {slide === 1 && (
            <div className="animate-fade-up">
              <h3 className="text-sm font-bold text-cyan-400 mb-4">
                {language === 'ja' ? '2. プレビュー＆ダウンロード' : '2. Preview & Download'}
              </h3>
              <p className="text-[10px] text-zinc-500 mb-4">
                {language === 'ja'
                  ? '※ダウンロード時に Gain / EQ / Limiter を実際に適用したWAVを書き出します'
                  : '※Download applies Gain / EQ / Limiter and exports real WAV'}
              </p>
              <MasteringAgent
                params={masteringParams}
                isLoading={false}
                error=""
                hasAnalysis={true}
                onDownloadMastered={onDownloadMastered}
                isProcessingAudio={isProcessingAudio}
                audioBuffer={audioBuffer}
              />
              {audioFile && (
                <div className="mt-6 pt-6 border-t border-white/5">
                  <button
                    type="button"
                    onClick={onToggleSaveToLibrary}
                    className="text-sm text-cyan-400 hover:text-cyan-300 font-medium"
                  >
                    {language === 'ja' ? '+ ライブラリに保存' : '+ Save to Library'}
                  </button>
                  {showSaveToLibrary && (
                    <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                      <input
                        value={saveToLibraryForm.title}
                        onChange={(e) => onSaveFormChange('title', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-base sm:text-sm text-white placeholder-zinc-500"
                        placeholder={language === 'ja' ? 'タイトル' : 'Title'}
                      />
                      <input
                        value={saveToLibraryForm.artist}
                        onChange={(e) => onSaveFormChange('artist', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-base sm:text-sm text-white placeholder-zinc-500"
                        placeholder={language === 'ja' ? 'アーティスト' : 'Artist'}
                      />
                      <div className="flex gap-2">
                        <button type="button" onClick={onSaveToLibrary} className="px-4 py-2 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-400">
                          {language === 'ja' ? '保存' : 'Save'}
                        </button>
                        <button type="button" onClick={onToggleSaveToLibrary} className="px-4 py-2 rounded-lg bg-white/10 text-zinc-400 text-sm hover:bg-white/20">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ナビゲーション */}
        <div className="flex items-center justify-between p-4 border-t border-white/5 gap-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => (slide > 0 ? setSlide(slide - 1) : onClose())}
            className="px-5 py-3 min-h-[44px] text-sm font-medium text-zinc-400 hover:text-white active:opacity-80 -ml-2"
          >
            {slide > 0 ? prevLabel : (language === 'ja' ? '閉じる' : 'Close')}
          </button>
          {slide < totalSlides - 1 ? (
            <button
              type="button"
              onClick={() => setSlide(slide + 1)}
              className="px-6 py-3 min-h-[44px] rounded-xl bg-cyan-500 text-black font-bold text-sm hover:bg-cyan-400 active:opacity-90"
            >
              {nextLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 min-h-[44px] rounded-xl bg-cyan-500 text-black font-bold text-sm hover:bg-cyan-400 active:opacity-90"
            >
              {language === 'ja' ? '完了' : 'Done'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
