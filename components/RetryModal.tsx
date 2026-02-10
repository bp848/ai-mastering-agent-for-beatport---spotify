import React from 'react';
import { FEEDBACK_OPTIONS, type FeedbackType } from '../services/feedbackService';

const RefreshCwIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className ?? 'w-5 h-5'}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className ?? 'w-6 h-6'}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

interface RetryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: (feedback: FeedbackType) => void;
  /** 指定した AI でパラメータを再計算（未設定の場合は UI 非表示） */
  onRecalcWithAI?: () => Promise<void>;
  /** 再計算中はボタンを無効化 */
  isRecalculating?: boolean;
  language?: 'ja' | 'en';
}

export const RetryModal: React.FC<RetryModalProps> = ({
  isOpen,
  onClose,
  onRetry,
  onRecalcWithAI,
  isRecalculating = false,
  language = 'ja',
}) => {
  if (!isOpen) return null;

  const title = language === 'ja' ? 'AI パラメータ・チューニング' : 'AI Parameter Tuning';
  const subtitle = language === 'ja'
    ? '現在の結果に対する「違和感」を教えてください。処理ロジックを修正して再生成します。'
    : 'Tell us what feels off. We will adjust the processing and re-render.';
  const footer = language === 'ja'
    ? 'フィードバックに基づき DSP を再キャリブレートします。'
    : 'AI AGENT WILL RE-CALIBRATE DSP ENGINE BASED ON YOUR FEEDBACK.';

  const showRecalc = !!onRecalcWithAI;
  const recalcLabel = language === 'ja' ? 'AIで再計算' : 'Re-calculate with AI';
  const openaiLabel = language === 'ja' ? 'OpenAI で再計算' : 'Re-calc with OpenAI';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      style={{ animation: 'fade-in 0.2s ease-out' }}
    >
      <div className="w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-500"><RefreshCwIcon className="w-5 h-5" /></span>
              {title}
            </h2>
            <p className="text-sm text-zinc-400 mt-1">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 hover:text-white"
            aria-label={language === 'ja' ? '閉じる' : 'Close'}
          >
            <XIcon />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
          {showRecalc && (
            <section>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">{recalcLabel}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onRecalcWithAI()}
                  disabled={isRecalculating}
                  className="px-4 py-2.5 rounded-xl border border-cyan-500/50 bg-cyan-500/10 text-cyan-400 font-mono text-sm hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isRecalculating ? (language === 'ja' ? '再計算中...' : 'Re-calculating...') : openaiLabel}
                </button>
              </div>
            </section>
          )}

          <section>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              {language === 'ja' ? '違和感を選ぶ（プリセット補正）' : 'Choose feedback (preset adjustment)'}
            </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEEDBACK_OPTIONS.map((option) => {
              const parts = option.label.split(' / ');
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onRetry(option.id)}
                  className="group relative flex items-start gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-800 hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.1)] transition-all duration-200 text-left"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform duration-200">
                    {option.icon}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-zinc-200 group-hover:text-cyan-400 mb-1">
                      {parts[0]}
                    </h3>
                    <p className="text-xs text-zinc-500 group-hover:text-zinc-400">
                      {parts[1] ?? (language === 'ja' ? '修正を適用' : 'Apply fix')}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          </section>
        </div>

        <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 text-center text-xs text-zinc-500 font-mono">
          {footer}
        </div>
      </div>
    </div>
  );
};

export default RetryModal;
