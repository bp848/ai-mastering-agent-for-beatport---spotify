import React from 'react';
import type { AudioAnalysisData, MasteringTarget, MasteringParams } from '../types';
import AnalysisDisplay from './AnalysisDisplay';
import MasteringAgent from './MasteringAgent';
import Console, { type ActionLog } from './Console';
import { Spinner, DownloadIcon } from './Icons';
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
  actionLogs?: ActionLog[];
  onNextTrack?: () => void;
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
  actionLogs = [],
  onNextTrack,
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
  const closeBackLabel = t('modal.close_back');
  const closeBackAria = t('modal.close_back_aria');
  const nextTrackLabel = t('modal.next_track');
  const nextTrackAria = t('modal.next_track_aria');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm safe-area-padding"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-screen-xl overflow-hidden flex flex-col sm:rounded-2xl rounded-none glass shadow-2xl"
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
            <div className="animate-fade-up space-y-6">
              <h3 className="text-sm font-bold text-cyan-400 mb-4">
                {language === 'ja' ? '1. 分析結果（プロ基準・端折らず）' : '1. Analysis (Pro standard · no shortcuts)'}
              </h3>
              <AnalysisDisplay
                data={analysisData}
                isLoading={false}
                masteringTarget={masteringTarget}
                onTargetChange={onTargetChange}
              />
              {actionLogs.length > 0 && (
                <Console logs={actionLogs} compact={false} />
              )}
            </div>
          )}
          {slide === 1 && (
            <div className="animate-fade-up space-y-5">
              <h3 className="text-sm font-bold text-cyan-400 mb-1">
                {language === 'ja' ? '2. プレビュー → 購入・ダウンロード' : '2. Preview → Purchase & Download'}
              </h3>
              <p className="text-[10px] text-zinc-500 mb-2">
                {language === 'ja'
                  ? '再生で確認してから、下のボタンで購入（1曲1,000円）してWAVをダウンロード。'
                  : 'Preview first, then use the button below to purchase (¥1,000/track) and download WAV.'}
              </p>

              {/* 聞き比べの判断材料：耳以外の数値比較 */}
              <section className="rounded-xl bg-white/[0.04] border border-white/10 p-4">
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-3">
                  {language === 'ja' ? '聞き比べの判断材料（数値）' : 'A/B comparison (metrics)'}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-zinc-500 mb-2 font-medium">
                      {language === 'ja' ? 'オリジナル（分析値）' : 'Original (analysis)'}
                    </p>
                    <ul className="text-xs font-mono space-y-1">
                      <li className="text-zinc-300">LUFS {analysisData.lufs.toFixed(1)}</li>
                      <li className="text-zinc-300">TP {analysisData.truePeak.toFixed(1)} dB</li>
                      <li className="text-zinc-300">Crest {analysisData.crestFactor.toFixed(1)}</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] text-cyan-500 mb-2 font-medium">
                      {language === 'ja' ? 'マスター（目標/適用後）' : 'Master (target / applied)'}
                    </p>
                    <ul className="text-xs font-mono space-y-1">
                      <li className="text-cyan-300">
                        LUFS {masteringTarget === 'beatport' ? '-7.0' : '-14.0'}
                        <span className="text-zinc-500 text-[10px] ml-1">
                          (+{masteringParams.gain_adjustment_db.toFixed(1)} dB)
                        </span>
                      </li>
                      <li className="text-cyan-300">
                        TP {(masteringParams.limiter_ceiling_db ?? -0.1).toFixed(1)} dB
                      </li>
                      <li className="text-zinc-500">—</li>
                    </ul>
                  </div>
                </div>
                <p className="text-[9px] text-zinc-600 mt-2">
                  {language === 'ja'
                    ? '再生中のリアルタイム Peak は下のメーターで確認。'
                    : 'Check real-time peak in the meter below while playing.'}
                </p>
              </section>

              <MasteringAgent
                params={masteringParams}
                isLoading={false}
                onDownloadMastered={onDownloadMastered}
                isProcessingAudio={isProcessingAudio}
                audioBuffer={audioBuffer}
                hideDownloadButton
              />
            </div>
          )}
        </div>

        {/* 高密度アクションバー (64px) — [ 戻る ] [ 次の曲をアップロード ] [ WAVをダウンロード ] */}
        <div
          className="flex items-center justify-between gap-2 px-4 border-t border-white/5 shrink-0"
          style={{
            minHeight: 64,
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            background: 'rgba(0,0,0,0.3)',
          }}
        >
          <button
            type="button"
            onClick={() => (slide > 0 ? setSlide(slide - 1) : onClose())}
            className="flex items-center gap-1.5 px-3 py-3 min-w-0 text-sm font-medium text-zinc-400 hover:text-white active:opacity-80 font-mono shrink-0"
            aria-label={slide > 0 ? undefined : closeBackAria}
          >
            <span className="text-lg leading-none">‹</span>
            {slide > 0 ? prevLabel : closeBackLabel}
          </button>

          <div className="flex-1 flex items-center justify-center min-w-0">
            {slide === totalSlides - 1 && onNextTrack ? (
              <button
                type="button"
                onClick={() => { onClose(); onNextTrack(); }}
                className="px-4 py-3 rounded-lg text-sm font-medium text-zinc-300 hover:text-white border border-white/15 hover:bg-white/5 transition-colors font-mono"
                aria-label={nextTrackAria}
              >
                {nextTrackLabel}
              </button>
            ) : slide < totalSlides - 1 ? (
              <button
                type="button"
                onClick={() => setSlide(slide + 1)}
                className="px-4 py-3 rounded-lg text-sm font-medium text-zinc-300 hover:text-white border border-white/15 font-mono"
              >
                {nextLabel}
              </button>
            ) : null}
          </div>

          <div className="shrink-0 w-[180px] flex justify-end">
            {slide === totalSlides - 1 ? (
              <button
                type="button"
                onClick={onDownloadMastered}
                disabled={isProcessingAudio}
                className="flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-xl font-bold text-sm text-black bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all font-mono"
                style={{ boxShadow: '0 0 16px rgba(34,211,238,0.35)' }}
              >
                {isProcessingAudio ? (
                  <>
                    <Spinner />
                    <span className="whitespace-nowrap">{language === 'ja' ? '書き出し中...' : 'Exporting...'}</span>
                  </>
                ) : (
                  <>
                    <DownloadIcon />
                    <span className="whitespace-nowrap">{language === 'ja' ? 'WAVをダウンロード' : 'Download WAV'}</span>
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
