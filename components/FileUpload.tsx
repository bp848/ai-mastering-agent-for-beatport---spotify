
import React, { useRef } from 'react';
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
  const isReady = pyodideStatus === t('upload.pyodide.ready');
  const isDisabled = isAnalyzing || !isReady;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null;
    onFileChange(file);
    if(event.target) event.target.value = '';
  };

  const handleClick = () => {
    if (!isDisabled) fileInputRef.current?.click();
  };

  return (
    <div 
      className={`relative h-40 flex flex-col items-center justify-center bg-[#1a1a1a] border border-white/10 rounded-2xl transition-all duration-300 ${!isDisabled ? 'cursor-pointer hover:border-emerald-500/50 hover:bg-[#222]' : 'opacity-50 cursor-not-allowed'}`}
      onClick={handleClick}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      aria-label={t('upload.aria.label')}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept="audio/wav, audio/mp3, audio/aiff"
        disabled={isDisabled}
      />
      
      {!isReady ? (
        <div className="flex flex-col items-center">
            <div className="w-8 h-8 opacity-20"><Spinner /></div>
            <p className="text-[10px] text-gray-500 mt-4 font-black uppercase tracking-widest">Initializing Engine...</p>
        </div>
      ) : isAnalyzing ? (
        <div className="flex flex-col items-center">
            <div className="w-8 h-8 text-emerald-500"><Spinner /></div>
            <p className="text-[10px] text-emerald-500 mt-4 font-black uppercase tracking-widest">Processing...</p>
        </div>
      ) : (
        <>
            <div className="w-8 h-8 mb-4 text-gray-600"><UploadIcon /></div>
            {fileName ? (
                <p className="text-[11px] font-mono text-emerald-400 font-bold px-4 truncate w-full text-center">{fileName}</p>
            ) : (
                <div className="text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('upload.cta.title')}</p>
                    <p className="text-[9px] text-gray-600 mt-1 uppercase font-bold tracking-tighter">WAV / MP3 / AIFF</p>
                </div>
            )}
        </>
      )}
    </div>
  );
};

export default FileUpload;
