import React, { useState } from 'react';
import type { AudioAnalysisData, MasteringTarget, MasteringParams } from '../types';
import AnalysisDisplay from './AnalysisDisplay';
import MasteringAgent from './MasteringAgent';
import Console, { type ActionLog } from './Console';
import ExportModal from './ExportModal';
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
  const [showExportModal, setShowExportModal] = useState(false);
  const contentScrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open) {
      setSlide(1);
      contentScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [open]);

  React.useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [slide]);

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
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center px-4 py-2 rounded-full text-[11px] font-medium transition-all ${slide === i ? 'bg-cyan-500 text-black' : 'bg-white/10 text-zinc-400 hover:bg-white/20'}`}
              aria-label={i === 0 ? (language === 'ja' ? '分析結果' : 'Analysis') : (language === 'ja' ? 'プレビュー・購入' : 'Preview & Purchase')}
            >
              {i === 0 ? (language === 'ja' ? '分析' : 'Analysis') : (language === 'ja' ? '聴く・購入' : 'Listen & Buy')}
            </button>
          ))}
        </div>

        {/* スライド内容 */}
        <div ref={contentScrollRef} className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 scroll-touch">
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
              {/* [PLATFORM SPECIFIC] Automation & Blueprint Transparency */}
              <section className="rounded-xl bg-cyan-950/10 border border-cyan-500/20 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">{language === 'ja' ? 'フルスキャン・藍写真 (Blueprint)' : 'Full-Scan Processing Blueprint'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                  <div className="space-y-1">
                    <p className="text-zinc-500 uppercase text-[9px]">{language === 'ja' ? 'ゲイン・ライディング' : 'Gain Riding'}</p>
                    <p className="text-zinc-200 font-mono">
                      {masteringParams.dynamic_automation?.input_gain_offset_quiet_db?.toFixed(1) ?? '0.0'} dB Offset
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-zinc-500 uppercase text-[9px]">{language === 'ja' ? 'ステレオ拡幅' : 'Width Expansion'}</p>
                    <p className="text-zinc-200 font-mono">
                      +{masteringParams.dynamic_automation?.width_boost_drop_percent?.toFixed(0) ?? '0'}% at Drop
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-zinc-500 uppercase text-[9px]">{language === 'ja' ? 'トランジェント' : 'Transient'}</p>
                    <p className="text-zinc-200 font-mono">
                      {masteringParams.transient_attack_s ? (masteringParams.transient_attack_s * 1000).toFixed(0) : '20'}ms Attack
                    </p>
                  </div>
                </div>
              </section>

              {actionLogs.length > 0 && (
                <Console logs={actionLogs} compact={false} />
              )}
            </div>
          )}
          {slide === 1 && (
            <div className="animate-fade-up space-y-5">
              <h3 className="text-base font-bold text-cyan-400 mb-1">
                {language === 'ja' ? '2. プレビュー → マイページへ保存' : '2. Preview → Save to My Page'}
              </h3>
              <p className="text-[13px] text-zinc-400 mb-2">
                {language === 'ja' ? '仕上がりを確認し、問題なければ購入ボタンを押してください。購入後、マイページからダウンロード可能になります。' : 'Check the result. If okay, click purchase. You can download from My Page after purchase.'}
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

              {/* ビデオエクスポート */}
              <button
                type="button"
                onClick={() => setShowExportModal(true)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-colors text-sm font-bold"
              >
                <span aria-hidden>🎬</span>
                {t('export.video.button')}
              </button>

              {/* YouTube Before/After → 30曲無料キャンペーン */}
              <a
                href={`mailto:ishijima@b-p.co.jp?subject=${encodeURIComponent(language === 'ja' ? 'YouTube Before/After 30曲無料キャンペーン応募' : 'YouTube Before/After 30 tracks free - Application')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 hover:bg-amber-500/15 transition-colors"
              >
                <p className="text-sm font-bold text-amber-200">
                  {language === 'ja' ? '🎬 YouTubeでBefore/Afterをアップしてくれたら30曲無料' : '🎬 30 tracks free — upload Before/After to YouTube'}
                </p>
                <p className="text-xs text-amber-200/80 mt-1">
                  {language === 'ja'
                    ? '本サービスのBefore/AfterをYouTubeで紹介してくださった方に、30曲分のダウンロード権をプレゼント。応募はメールで。'
                    : 'We gift 30 download credits to anyone who shares a Before/After on YouTube. Apply by email.'}
                </p>
                <span className="inline-block mt-2 text-xs font-bold text-amber-400 underline underline-offset-2">
                  {language === 'ja' ? '応募・お問い合わせ' : 'Apply / Contact'}
                </span>
              </a>

              <MasteringAgent
                params={masteringParams}
                isLoading={false}
                onDownloadMastered={onDownloadMastered}
                isProcessingAudio={isProcessingAudio}
                audioBuffer={audioBuffer}
                analysisData={analysisData}
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

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        audioBuffer={audioBuffer}
        masteringParams={masteringParams}
        analysisData={analysisData}
        fileName={audioFile?.name}
        language={language}
      />
    </div>
  );
}
