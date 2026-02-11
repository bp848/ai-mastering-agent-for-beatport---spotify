import React from 'react';
import type { AudioAnalysisData, MasteringTarget, MasteringParams } from '../types';
import AnalysisDisplay from './AnalysisDisplay';
import MasteringAgent from './MasteringAgent';
import Console, { type ActionLog } from './Console';
import { Spinner, CardIcon } from './Icons';
import { useTranslation } from '../contexts/LanguageContext';

interface ResultsModalProps {
  open: boolean;
  onClose: () => void;
  analysisData: AudioAnalysisData;
  masteringParams: MasteringParams;
  masteringTarget: MasteringTarget;
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
  onFeedbackApply?: (newParams: MasteringParams) => void;
  onRecalcWithAI?: () => Promise<void>;
  masterMetrics?: { lufs: number; peakDb: number } | null;
  rawMasteringResponseText?: string | null;
}

export default function ResultsModal({
  open,
  onClose,
  analysisData,
  masteringParams,
  masteringTarget,
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
  onFeedbackApply,
  onRecalcWithAI,
  masterMetrics = null,
  rawMasteringResponseText = null,
}: ResultsModalProps) {
  const { t } = useTranslation();
  const [slide, setSlide] = React.useState(1);
  const totalSlides = 2;
  const [openRawDiagnosis, setOpenRawDiagnosis] = React.useState(false);
  const [openRawAI, setOpenRawAI] = React.useState(false);
  const ja = language === 'ja';

  React.useEffect(() => {
    if (open) setSlide(1);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 safe-area-padding"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-screen-xl overflow-hidden flex flex-col sm:rounded-2xl rounded-none border border-border shadow-2xl" style={{ background: 'rgba(10,10,14,0.98)' }}>
        {/* Tab navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-1">
            {[0, 1].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSlide(i)}
                className={`min-h-[40px] px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  slide === i
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {i === 0 ? (ja ? '分析詳細' : 'Analysis') : (ja ? '試聴 & 購入' : 'Listen & Get')}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Slide content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 scroll-touch">
          {slide === 0 && (
            <div className="animate-fade-up space-y-6">
              <AnalysisDisplay data={analysisData} isLoading={false} masteringTarget={masteringTarget} />

              {/* Raw diagnosis data */}
              <details className="rounded-xl border border-border overflow-hidden">
                <summary className="px-4 py-3 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer uppercase tracking-wider">
                  {ja ? '診断API生数値' : 'Raw Diagnosis Data'}
                </summary>
                <pre className="p-4 text-[11px] font-mono text-muted-foreground overflow-x-auto max-h-[280px] whitespace-pre-wrap break-all border-t border-border" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  {JSON.stringify(analysisData, null, 2)}
                </pre>
              </details>

              {/* Raw AI output */}
              <details className="rounded-xl border border-border overflow-hidden">
                <summary className="px-4 py-3 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer uppercase tracking-wider">
                  {ja ? 'AI指示出力（全文）' : 'AI Output (Full)'}
                </summary>
                <pre className="p-4 text-[11px] font-mono text-muted-foreground overflow-x-auto max-h-[280px] whitespace-pre-wrap break-all border-t border-border" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  {rawMasteringResponseText ?? (ja ? '(マスタリング実行後に表示)' : '(Shown after mastering)')}
                </pre>
              </details>

              {actionLogs.length > 0 && <Console logs={actionLogs} compact={false} />}
            </div>
          )}

          {slide === 1 && (
            <div className="animate-fade-up space-y-6">
              {/* Comparison card */}
              <div className="rounded-2xl border border-border p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                  {ja ? 'Original vs Master' : 'Original vs Master'}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl p-4 border border-border" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                      {ja ? 'オリジナル' : 'Original'}
                    </p>
                    <ul className="text-sm font-mono space-y-1 font-semibold text-foreground tabular-nums">
                      <li>LUFS {analysisData.lufs.toFixed(1)}</li>
                      <li>TP {analysisData.truePeak.toFixed(1)} dB</li>
                      <li>Crest {analysisData.crestFactor.toFixed(1)}</li>
                    </ul>
                  </div>
                  <div className="rounded-xl p-4 border border-primary/30" style={{ background: 'rgba(34,211,238,0.03)' }}>
                    <p className="text-[10px] text-primary uppercase tracking-wider mb-2">
                      {ja ? 'マスター' : 'Master'}
                    </p>
                    {masterMetrics ? (
                      <ul className="text-sm font-mono space-y-1 font-semibold text-primary tabular-nums">
                        <li>LUFS {masterMetrics.lufs.toFixed(1)}</li>
                        <li>TP {masterMetrics.peakDb.toFixed(1)} dB</li>
                        <li className="text-xs text-muted-foreground">
                          {ja ? '目標' : 'Target'} {masteringTarget === 'beatport' ? '-8.0' : '-14.0'} LUFS
                        </li>
                      </ul>
                    ) : (
                      <ul className="text-sm font-mono space-y-1 text-primary/80 tabular-nums">
                        <li>LUFS {masteringTarget === 'beatport' ? '-8.0' : '-14.0'} (target)</li>
                        <li>TP {(masteringParams.limiter_ceiling_db ?? (masteringTarget === 'beatport' ? -0.3 : -1.0)).toFixed(1)} dB</li>
                      </ul>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  {ja
                    ? '下のプレイヤーでマスターとオリジナルを切り替えて聞き比べできます。'
                    : 'Use the player below to A/B compare Master vs Original.'}
                </p>
              </div>

              {/* Player */}
              <MasteringAgent
                params={masteringParams}
                isLoading={false}
                onDownloadMastered={onDownloadMastered}
                isProcessingAudio={isProcessingAudio}
                audioBuffer={audioBuffer}
                hideDownloadButton
                onFeedbackApply={onFeedbackApply}
                onRecalcWithAI={onRecalcWithAI}
                language={language}
              />
            </div>
          )}
        </div>

        {/* Bottom action bar */}
        <div
          className="flex items-center justify-between gap-3 px-4 border-t border-border shrink-0"
          style={{
            minHeight: 72,
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
            background: 'rgba(0,0,0,0.4)',
          }}
        >
          <button
            type="button"
            onClick={() => (slide > 0 ? setSlide(slide - 1) : onClose())}
            className="flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
            {slide > 0 ? (ja ? '分析詳細' : 'Analysis') : (ja ? '閉じる' : 'Close')}
          </button>

          <div className="flex items-center gap-3">
            {slide < totalSlides - 1 && (
              <button
                type="button"
                onClick={() => setSlide(slide + 1)}
                className="btn-secondary text-sm"
              >
                {ja ? '試聴へ' : 'Listen'}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
              </button>
            )}

            {slide === totalSlides - 1 && (
              <button
                type="button"
                onClick={onDownloadMastered}
                disabled={isProcessingAudio}
                className="btn-primary text-sm"
              >
                {isProcessingAudio ? (
                  <>
                    <span className="w-4 h-4"><Spinner /></span>
                    <span>{ja ? '書き出し中...' : 'Exporting...'}</span>
                  </>
                ) : (
                  <>
                    <CardIcon className="w-5 h-5" />
                    <span>{t('result.purchase_cta')}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
