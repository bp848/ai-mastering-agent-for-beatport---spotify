/**
 * 提供デザイン（ai-music-mastering）のヒーローをそのまま再現。
 * 1カラム・バッジ・見出し・リード・タグ・統計・ドロップゾーン・CTA・信頼表示。
 */
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { UploadIcon, Spinner } from './Icons';

const TAGS_JA = ['配信リリース', 'YouTube / MV', 'DJプレイ', 'ライブPA'];
const TAGS_EN = ['Streaming', 'YouTube / MV', 'DJ Play', 'Live PA'];

const isAudioFile = (file: File) =>
  /audio\/(wav|mp3|mpeg|aiff|x-aiff|wave|mp4|m4a)|\.(wav|mp3|aiff|aif|m4a|flac)$/i.test(file.type || file.name);

interface ReferenceHeroProps {
  language: 'ja' | 'en';
  onFileChange: (file: File | null) => void;
  fileName?: string | null;
  isAnalyzing: boolean;
  pyodideStatus: string;
  error?: string;
  onErrorRetry?: () => void;
}

export default function ReferenceHero({
  language,
  onFileChange,
  fileName,
  isAnalyzing,
  pyodideStatus,
  error,
  onErrorRetry,
}: ReferenceHeroProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const ja = language === 'ja';
  const tags = ja ? TAGS_JA : TAGS_EN;
  const isReady = pyodideStatus === t('upload.pyodide.ready');
  const isDisabled = isAnalyzing || !isReady;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!isDisabled) setIsDragging(true);
  }, [isDisabled]);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isDisabled) return;
    const file = e.dataTransfer.files[0];
    if (file && isAudioFile(file)) onFileChange(file);
  }, [isDisabled, onFileChange]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    onFileChange(file);
    if (e.target) e.target.value = '';
  }, [onFileChange]);

  const handleZoneClick = useCallback(() => {
    if (!isDisabled) fileInputRef.current?.click();
  }, [isDisabled]);

  return (
    <section className="relative overflow-hidden pt-12 pb-12 md:pt-16 md:pb-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4">
        {/* Top badge - 参照どおり */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-xs font-medium text-primary">
              {ja ? '今だけ1曲無料 - 登録不要・クレカ不要' : '1 track free - No signup, no card'}
            </span>
          </div>
        </div>

        {/* Headline - Legacy Hardware Context */}
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-2 text-xs font-bold tracking-[0.3em] uppercase text-primary/80">
            {t('brand.hardware.spirit')}
          </h2>
          <h1 className="text-balance text-3xl font-bold leading-[1.1] tracking-tight text-foreground md:text-5xl lg:text-6xl">
            {ja ? 'あなたの曲に、' : 'Master your track with'}
            <br />
            <span className="text-primary italic">{ja ? '日本の音響の執念' : 'Japanese Precision.'}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base font-medium text-muted-foreground md:text-lg">
            {t('brand.hardware.trust')}
            <br className="hidden md:block" />
            <span className="text-foreground/90">{t('brand.hardware.mission')}</span>
          </p>
          <div className="mx-auto mt-4 flex flex-wrap items-center justify-center gap-2">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Stats row - LCD Style */}
        <div className="mx-auto mt-10 flex max-w-2xl items-center justify-center gap-4 md:gap-8">
          <div className="lcd-screen flex-1 text-center">
            <div className="lcd-value text-2xl font-bold md:text-3xl">4,700+</div>
            <div className="text-[10px] uppercase tracking-wider text-primary/60">{ja ? '処理済み' : 'processed'}</div>
          </div>
          <div className="lcd-screen flex-1 text-center border-primary/30">
            <div className="lcd-value text-2xl font-bold md:text-3xl">30 SEC</div>
            <div className="text-[10px] uppercase tracking-wider text-primary/60">{ja ? '平均処理' : 'average'}</div>
          </div>
          <div className="lcd-screen flex-1 text-center">
            <div className="lcd-value text-2xl font-bold md:text-3xl">MADE IN</div>
            <div className="text-[10px] uppercase tracking-wider text-primary/60">TOKYO, JP</div>
          </div>
        </div>

        {/* Upload CTA area - 参照どおり */}
        <div className="mx-auto mt-10 max-w-xl">
          <div
            role="button"
            tabIndex={isDisabled ? -1 : 0}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleZoneClick}
            onKeyDown={(e) => { if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleZoneClick(); } }}
            className={`group hardware-chassis relative cursor-pointer rounded-xl border p-12 text-center transition-all md:p-14 ${isDisabled ? 'opacity-70 cursor-not-allowed' : ''} ${isDragging
              ? 'border-primary shadow-[0_0_50px_hsl(180_100%_50%/0.3)]'
              : fileName
                ? 'border-primary/60 shadow-[0_0_30px_hsl(180_100%_50%/0.15)]'
                : 'border-white/10 shadow-2xl hover:border-primary/50'
              }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".wav,.mp3,.aiff,.flac,audio/*"
              onChange={handleFileSelect}
              className="hidden"
              aria-label={t('upload.aria.label')}
            />

            {!isReady ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <span className="h-8 w-8 block"><Spinner /></span>
                </div>
                <p className="text-sm font-medium text-foreground">{t('upload.pyodide.loading')}</p>
                <p className="text-xs text-muted-foreground">{t('upload.pyodide.detail')}</p>
              </div>
            ) : isAnalyzing ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <span className="h-8 w-8 block"><Spinner /></span>
                </div>
                <p className="text-lg font-bold text-foreground">{t('upload.analyzing')}</p>
                <p className="text-xs text-muted-foreground">{t('upload.analyzing.detail')}</p>
              </div>
            ) : fileName ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <span className="h-6 w-6 block"><UploadIcon /></span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{fileName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {ja ? 'クリックして別のファイルを選択' : 'Click to choose another file'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="animate-float flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-primary shadow-[0_0_20px_hsl(180_100%_50%/0.2)] transition-transform group-hover:scale-110">
                  <span className="h-8 w-8 block"><UploadIcon /></span>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {ja ? 'ここに音源をドロップ' : 'Drop your audio here'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    WAV / MP3 / AIFF {ja ? '対応 (24bit/44.1kHz以上推奨)' : 'supported (24bit/44.1kHz+ recommended)'}
                  </p>
                  <p className="mt-0.5 text-xs text-primary/70">
                    {ja ? 'クリックしてファイルを選択することもできます' : 'Or click to select a file'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Main CTA button - 参照どおり */}
          <button
            type="button"
            disabled={isDisabled}
            onClick={handleZoneClick}
            className="animate-pulse-glow mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed md:text-lg"
          >
            {isReady && !isAnalyzing ? (
              <>
                <span className="inline-block h-5 w-5" aria-hidden>⚡</span>
                {ja ? '無料でAIマスタリングを開始' : 'Start free AI mastering'}
                <span className="inline-block h-5 w-5" aria-hidden>→</span>
              </>
            ) : (
              <>
                <span className="h-5 w-5 block text-primary"><Spinner /></span>
                {isAnalyzing ? t('upload.analyzing') : t('upload.pyodide.loading')}
              </>
            )}
          </button>

          {/* Trust signals - Hardware Lineage */}
          <div className="mt-6 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-3">
              Inspired by the lineage of legends
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 opacity-40 grayscale transition-opacity hover:opacity-70">
              <span className="text-sm font-black tracking-tighter">Pioneer DJ</span>
              <span className="text-sm font-black tracking-tighter">Technics</span>
              <span className="text-sm font-black tracking-tighter">Roland</span>
              <span className="text-sm font-black tracking-tighter">KORG</span>
            </div>
          </div>
        </div>

        {error && onErrorRetry && (
          <div className="mx-auto mt-6 max-w-xl rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <button
              type="button"
              onClick={onErrorRetry}
              className="mt-3 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary/80"
            >
              {t('ux.error_retry')}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
