import React from 'react';
import type { AudioAnalysisData, MasteringTarget, MasteringParams } from '../types';
import AnalysisDisplay from './AnalysisDisplay';
import MasteringAgent from './MasteringAgent';
import Console, { type ActionLog } from './Console';
import { Spinner, DownloadIcon, CardIcon } from './Icons';
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
  /** マスター出力の実測値（耳以外の評価用） */
  masterMetrics?: { lufs: number; peakDb: number } | null;
  /** AI が返した生の JSON テキスト（全文・省略なし） */
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

  React.useEffect(() => {
    if (open) setSlide(1);
  }, [open]);

  if (!open) return null;

  const nextLabel = language === 'ja' ? '次へ' : 'Next';
  const prevLabel = language === 'ja' ? '前へ' : 'Back';
  const closeBackLabel = t('modal.close_back');
  const closeBackAria = t('modal.close_back_aria');
  const purchaseLabel = t('result.purchase_cta');
  const purchaseAria = t('result.purchase_cta_aria');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm safe-area-padding"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-screen-xl overflow-hidden flex flex-col sm:rounded-2xl rounded-none glass shadow-2xl">
        {/* スライド: 0=分析 / 1=プレビュー＆ダウンロード（初期表示） */}
        <div className="flex items-center justify-center gap-2 py-3 border-b border-white/5 pt-[max(0.75rem,env(safe-area-inset-top))]">
          {[0, 1].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSlide(i)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${slide === i ? 'bg-cyan-500 text-black' : 'bg-white/10 text-zinc-400 hover:bg-white/20'}`}
              aria-label={i === 0 ? (language === 'ja' ? '分析結果' : 'Analysis') : (language === 'ja' ? 'プレビュー・ダウンロード' : 'Preview & Download')}
            >
              {i === 0 ? (language === 'ja' ? '分析' : 'Analysis') : (language === 'ja' ? '聴く・DL' : 'Listen & DL')}
            </button>
          ))}
        </div>

        {/* スライド内容 */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 scroll-touch">
          {slide === 0 && (
            <div className="animate-fade-up space-y-6">
              <h3 className="text-base font-bold text-cyan-400 mb-4">
                {language === 'ja' ? '分析結果（プロ基準）' : 'Analysis (Pro standard)'}
              </h3>
              <AnalysisDisplay
                data={analysisData}
                isLoading={false}
                masteringTarget={masteringTarget}
              />
              {/* 診断API生数値：折りたたみ */}
              <section className="rounded-xl bg-black/40 border border-white/10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenRawDiagnosis((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left text-xs font-bold text-zinc-400 hover:text-white uppercase tracking-wider"
                >
                  {language === 'ja' ? '診断API生数値（開発者向け）' : 'Diagnosis API raw (developer)'}
                  <span className="text-lg leading-none">{openRawDiagnosis ? '−' : '+'}</span>
                </button>
                {openRawDiagnosis && (
                  <pre className="p-3 pt-0 rounded-lg bg-zinc-950 text-[11px] font-mono text-zinc-300 overflow-x-auto overflow-y-auto max-h-[280px] whitespace-pre-wrap break-all border-t border-white/10">
                    {JSON.stringify(analysisData, null, 2)}
                  </pre>
                )}
              </section>
              {/* AI指示出力：折りたたみ */}
              <section className="rounded-xl bg-black/40 border border-white/10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenRawAI((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left text-xs font-bold text-zinc-400 hover:text-white uppercase tracking-wider"
                >
                  {language === 'ja' ? 'AI指示出力（全文）' : 'AI output (full text)'}
                  <span className="text-lg leading-none">{openRawAI ? '−' : '+'}</span>
                </button>
                {openRawAI && (
                  <pre className="p-3 pt-0 rounded-lg bg-zinc-950 text-[11px] font-mono text-zinc-300 overflow-x-auto overflow-y-auto max-h-[280px] whitespace-pre-wrap break-all border-t border-white/10">
                    {rawMasteringResponseText ?? (language === 'ja' ? '（マスタリング実行後に表示）' : '(Shown after mastering run)')}
                  </pre>
                )}
              </section>
              {actionLogs.length > 0 && (
                <Console logs={actionLogs} compact={false} />
              )}
            </div>
          )}
          {slide === 1 && (
            <div className="animate-fade-up space-y-5">
              <h3 className="text-base font-bold text-cyan-400 mb-1">
                {language === 'ja' ? '2. プレビュー → ダウンロード' : '2. Preview → Download'}
              </h3>
              <p className="text-[13px] text-zinc-400 mb-2">
                {t('flow.preview_then_download')}
              </p>

              {/* 聞き比べの判断材料：耳＋数値（オリジナル vs マスター実測） */}
              <section className="rounded-xl bg-white/[0.04] border border-white/10 p-4">
                <p className="text-[13px] font-bold text-zinc-300 uppercase tracking-wider mb-3">
                  {language === 'ja' ? '評価：耳と数値の両方で判断' : 'Evaluate: by ear and by numbers'}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-zinc-900/50 p-3 border border-zinc-700/50">
                    <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">
                      {language === 'ja' ? 'オリジナル（実測）' : 'Original (measured)'}
                    </p>
                    <ul className="text-[14px] font-mono space-y-1 font-semibold text-zinc-200">
                      <li>LUFS {analysisData.lufs.toFixed(1)}</li>
                      <li>TP {analysisData.truePeak.toFixed(1)} dB</li>
                      <li>Crest {analysisData.crestFactor.toFixed(1)}</li>
                    </ul>
                  </div>
                  <div className="rounded-lg bg-cyan-950/40 p-3 border border-cyan-500/30">
                    <p className="text-[11px] text-cyan-400 uppercase tracking-wider mb-1">
                      {language === 'ja' ? 'マスター（実測）' : 'Master (measured)'}
                    </p>
                    {masterMetrics ? (
                      <ul className="text-[14px] font-mono space-y-1 font-semibold text-cyan-200">
                        <li>LUFS {masterMetrics.lufs.toFixed(1)}</li>
                        <li>TP {masterMetrics.peakDb.toFixed(1)} dB</li>
                        <li className="text-zinc-400 text-[12px]">
                          {language === 'ja' ? '目標' : 'Target'} {masteringTarget === 'beatport' ? '-8.0' : '-14.0'} LUFS
                        </li>
                      </ul>
                    ) : (
                      <ul className="text-[13px] font-mono space-y-1 text-cyan-200/80">
                        <li>LUFS {masteringTarget === 'beatport' ? '-8.0' : '-14.0'} (target)</li>
                        <li>
                          TP {(masteringParams.limiter_ceiling_db ?? (masteringTarget === 'beatport' ? -0.3 : -1.0)).toFixed(1)} dB
                        </li>
                      </ul>
                    )}
                  </div>
                </div>
                <p className="text-[12px] text-zinc-500 mt-3">
                  {language === 'ja'
                    ? '下の「聴く」でマスターとオリジナルを切り替えて聞き比べ。再生中はリアルタイム Peak をメーターで確認。'
                    : 'Use "Listen" below to switch Master vs Original. Check real-time peak in the meter while playing.'}
                </p>
              </section>

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

        {/* アクションバー — [ 戻る ] [ 次へ or 空 ] [ 購入してWAVを取得 ] */}
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
            className="flex items-center gap-1.5 px-3 py-3 min-w-0 text-[15px] font-medium text-zinc-300 hover:text-white active:opacity-80 font-mono shrink-0"
            aria-label={slide > 0 ? undefined : closeBackAria}
          >
            <span className="text-lg leading-none">‹</span>
            {slide > 0 ? prevLabel : closeBackLabel}
          </button>

          <div className="flex-1 flex items-center justify-center min-w-0">
            {slide < totalSlides - 1 ? (
              <button
                type="button"
                onClick={() => setSlide(slide + 1)}
                className="px-4 py-3 rounded-lg text-[15px] font-medium text-zinc-200 hover:text-white border border-white/20 font-mono"
              >
                {nextLabel}
              </button>
            ) : null}
          </div>

          <div className="shrink-0 w-[200px] sm:w-[240px] flex justify-end">
            {slide === totalSlides - 1 ? (
              <button
                type="button"
                onClick={onDownloadMastered}
                disabled={isProcessingAudio}
                aria-label={purchaseAria}
                className="flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-xl font-bold text-[14px] sm:text-[15px] text-black bg-cyan-500 hover:bg-cyan-400 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all font-mono text-center"
                style={{ boxShadow: '0 0 16px rgba(34,211,238,0.35)' }}
              >
                {isProcessingAudio ? (
                  <>
                    <Spinner />
                    <span className="whitespace-nowrap">{language === 'ja' ? '書き出し中...' : 'Exporting...'}</span>
                  </>
                ) : (
                  <>
                    <CardIcon className="w-5 h-5 shrink-0" />
                    <span className="whitespace-nowrap">{purchaseLabel}</span>
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
