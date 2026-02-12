
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
            <div className="w-5 h-5 shrink-0 text-primary">
              <Spinner />
            </div>
            <span className="text-sm text-muted-foreground">{t('upload.pyodide.loading')}</span>
          </div>
        ) : isAnalyzing ? (
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 shrink-0 text-primary">
              <Spinner />
            </div>
            <span className="text-sm text-muted-foreground">{t('upload.analyzing')}</span>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleClick(); }}
              className="min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 transition-colors"
              aria-label={t('upload.aria.label')}
            >
              {t('ux.select_file_button')}
            </button>
            {fileName && (
              <span className="text-sm text-primary truncate max-w-[200px] sm:max-w-none">{fileName}</span>
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
        relative min-h-[180px] sm:min-h-[200px] flex flex-col items-center justify-center rounded-2xl
        border-2 border-dashed transition-all duration-300 cursor-pointer
        ${isDragOver ? 'border-primary/60 bg-primary/15 shadow-[0_0_30px_hsl(180_100%_50%/0.2)] scale-[1.02]' : 'border-primary/40 bg-primary/5 hover:border-primary/70 hover:bg-primary/10 hover:shadow-[0_0_25px_hsl(180_100%_50%/0.15)]'}
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

      {!isReady ? (
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary animate-float">
            <Spinner />
          </div>
          <div className="text-center">
            <p className="text-sm text-foreground">{t('upload.pyodide.loading')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('upload.pyodide.detail')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('upload.pyodide.wait')}</p>
          </div>
        </div>
      ) : isAnalyzing ? (
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
            <Spinner />
          </div>
          <div className="text-center">
            <p className="text-sm text-foreground">{t('upload.analyzing')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('upload.analyzing.detail')}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-center px-6">
          <div className="w-14 h-14 rounded-2xl border border-primary/30 bg-primary/15 flex items-center justify-center text-primary animate-float shadow-[0_0_20px_hsl(180_100%_50%/0.2)]">
            <UploadIcon />
          </div>
          {fileName ? (
            <p className="text-sm text-primary truncate max-w-full">{fileName}</p>
          ) : (
            <>
              <p className="text-lg font-bold text-foreground">{t('upload.cta.title')}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('upload.cta.detail')}</p>
              <p className="text-xs text-primary/80 mt-0.5">{t('upload.cta.hint')}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
