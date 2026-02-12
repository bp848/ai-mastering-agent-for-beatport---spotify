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

        {/* Headline - 参照どおり */}
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
            {ja ? 'あなたの曲を' : 'Your track.'}
            <br />
            <span className="text-primary">{ja ? 'チャート上位の音圧' : 'Chart-ready loudness'}</span>
            {ja ? 'に仕上げる' : '.'}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-muted-foreground md:text-lg">
            {ja
              ? 'WAVをアップロードするだけ。AIが配信基準を自動解析し、配信・YouTube・DJプレイに最適化されたマスタリングを30秒で完了。'
              : 'Just upload WAV. AI analyzes to spec and delivers mastering optimized for streaming, YouTube and DJ in 30 seconds.'}
          </p>
          <div className="mx-auto mt-4 flex flex-wrap items-center justify-center gap-2">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Stats row - 参照どおり */}
        <div className="mx-auto mt-8 flex max-w-lg items-center justify-center gap-6 md:gap-10">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground md:text-3xl">4,700+</div>
            <div className="text-xs text-muted-foreground">{ja ? '曲を処理済み' : 'tracks processed'}</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground md:text-3xl">30秒</div>
            <div className="text-xs text-muted-foreground">{ja ? '処理時間' : 'processing'}</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground md:text-3xl">0円</div>
            <div className="text-xs text-muted-foreground">{ja ? '初回無料' : 'first free'}</div>
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
            className={`group cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all md:p-12 ${isDisabled ? 'opacity-70 cursor-not-allowed' : ''} ${
              isDragging
                ? 'border-primary bg-primary/15 shadow-[0_0_30px_hsl(180_100%_50%/0.2)]'
                : fileName
                  ? 'border-primary/60 bg-primary/10 shadow-[0_0_20px_hsl(180_100%_50%/0.1)]'
                  : 'border-primary/40 bg-primary/5 shadow-[0_0_15px_hsl(180_100%_50%/0.08)] hover:border-primary/70 hover:bg-primary/10 hover:shadow-[0_0_25px_hsl(180_100%_50%/0.15)]'
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

          {/* Trust signals - 参照どおり */}
          <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3.5 w-3.5 rounded border border-current" aria-hidden />
              {ja ? '登録不要' : 'No signup'}
            </span>
            <span>|</span>
            <span>{ja ? 'クレジットカード不要' : 'No card required'}</span>
            <span>|</span>
            <span>{ja ? 'すぐに聴ける' : 'Listen instantly'}</span>
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
