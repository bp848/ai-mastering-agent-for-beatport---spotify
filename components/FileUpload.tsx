
import React, { useRef, useState } from 'react';
import { UploadIcon, Spinner } from './Icons';
import { useTranslation } from '../contexts/LanguageContext';

interface FileUploadProps {
  onFileChange: (file: File | null) => void;
  fileName?: string;
  isAnalyzing: boolean;
  pyodideStatus: string;
  /** true のときドラッグ＆ドロップ領域を出さず、ボタン＋ファイル名のみの1行表示 */
  compact?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, fileName, isAnalyzing, pyodideStatus, compact = false }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const isReady = pyodideStatus === t('upload.pyodide.ready');
  const isDisabled = isAnalyzing || !isReady;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null;
    onFileChange(file);
    if (event.target) event.target.value = '';
  };

  const handleClick = () => {
    if (!isDisabled) fileInputRef.current?.click();
  };

  const isAudioFile = (file: File) =>
    /audio\/(wav|mp3|mpeg|aiff|x-aiff|wave|mp4|m4a)|\.(wav|mp3|aiff|aif|m4a)$/i.test(file.type || file.name);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (isDisabled) return;
    const file = e.dataTransfer.files[0];
    if (file && isAudioFile(file)) {
      onFileChange(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDisabled) {
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isDisabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="audio/*,.wav,.mp3,.aiff,.aif,.m4a"
          disabled={isDisabled}
        />
        {!isReady ? (
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 shrink-0 text-cyan-400">
              <Spinner />
            </div>
            <span className="text-sm text-zinc-400">{t('upload.pyodide.loading')}</span>
          </div>
        ) : isAnalyzing ? (
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 shrink-0 text-cyan-400">
              <Spinner />
            </div>
            <span className="text-sm text-zinc-400">{t('upload.analyzing')}</span>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleClick(); }}
              className="min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-colors"
              aria-label={t('upload.aria.label')}
            >
              {t('ux.select_file_button')}
            </button>
            {fileName && (
              <span className="text-sm text-cyan-400 truncate max-w-[200px] sm:max-w-none">{fileName}</span>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-label={t('upload.aria.label')}
      className={`
        relative min-h-[220px] sm:min-h-[260px] flex flex-col items-center justify-center rounded-3xl
        border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden
        ${isDragOver ? 'border-cyan-400 bg-gradient-to-br from-cyan-500/20 to-purple-500/10 scale-[1.02] shadow-2xl shadow-cyan-500/30' : 'border-white/20 hover:border-cyan-400/50 hover:bg-gradient-to-br hover:from-white/[0.03] hover:to-transparent'}
        ${isDisabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}
      `}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept="audio/*,.wav,.mp3,.aiff,.aif,.m4a"
        disabled={isDisabled}
      />

      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 pointer-events-none" />
      {!isReady ? (
        <div className="relative z-10 flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center text-cyan-300 shadow-lg">
            <Spinner />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-white">{t('upload.pyodide.loading')}</p>
            <p className="text-sm text-zinc-400 mt-2 max-w-md leading-relaxed">{t('upload.pyodide.detail')}</p>
            <p className="text-xs text-zinc-500 mt-3">{t('upload.pyodide.wait')}</p>
          </div>
        </div>
      ) : isAnalyzing ? (
        <div className="relative z-10 flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center text-cyan-300 shadow-lg animate-pulse-glow">
            <Spinner />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-white">{t('upload.analyzing')}</p>
            <p className="text-sm text-zinc-400 mt-2">{t('upload.analyzing.detail')}</p>
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex flex-col items-center gap-4 text-center px-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center text-cyan-400 shadow-xl border border-cyan-500/30">
            <UploadIcon />
          </div>
          {fileName ? (
            <p className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 truncate max-w-full">{fileName}</p>
          ) : (
            <>
              <p className="text-xl font-extrabold text-white">{t('upload.cta.title')}</p>
              <p className="text-sm text-zinc-400 mt-1 max-w-md leading-relaxed">{t('upload.cta.detail')}</p>
              <div className="mt-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-400/30">
                <p className="text-xs font-semibold text-cyan-300">{t('upload.cta.hint')}</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
