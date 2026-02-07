
import React, { useRef, useState } from 'react';
import { UploadIcon, Spinner } from './Icons';
import { useTranslation } from '../contexts/LanguageContext';

interface FileUploadProps {
  onFileChange: (file: File | null) => void;
  fileName?: string;
  isAnalyzing: boolean;
  pyodideStatus: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, fileName, isAnalyzing, pyodideStatus }) => {
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

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-label={t('upload.aria.label')}
      className={`
        relative min-h-[180px] sm:min-h-[200px] flex flex-col items-center justify-center rounded-2xl
        border-2 border-dashed transition-all duration-300 cursor-pointer
        ${isDragOver ? 'border-cyan-500/60 bg-cyan-500/10 scale-[1.02]' : 'border-white/10 hover:border-cyan-500/40 hover:bg-white/[0.02]'}
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
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Spinner />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-white">{t('upload.pyodide.loading')}</p>
            <p className="text-xs text-zinc-500 mt-1">{t('upload.pyodide.detail')}</p>
          </div>
        </div>
      ) : isAnalyzing ? (
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Spinner />
          </div>
          <p className="text-sm font-medium text-white">{t('upload.analyzing')}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 flex items-center justify-center text-cyan-400">
            <UploadIcon />
          </div>
          {fileName ? (
            <p className="text-sm font-medium text-cyan-400 truncate max-w-full">{fileName}</p>
          ) : (
            <>
              <p className="text-base font-semibold text-white">{t('upload.cta.title')}</p>
              <p className="text-xs text-zinc-500">{t('upload.cta.detail')}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
