import React, { useEffect } from 'react';
import ReferenceHero from '../ReferenceHero';
import LPHeader from './LPHeader';
import LPFooter from './LPFooter';
import SocialProofSection from './SocialProofSection';
import HowItWorksSection from './HowItWorksSection';
import FeaturesSection from './FeaturesSection';
import MasteringDemoSection from './MasteringDemoSection';
import PricingSection from './PricingSection';
import FaqSection from './FaqSection';
import FinalCtaSection from './FinalCtaSection';
import ChangelogSection from './ChangelogSection';
import AlgorithmSection from './AlgorithmSection';
import GenreNoticeSection from './GenreNoticeSection';
import StatusLoader from '../StatusLoader';
import DiagnosisReport from '../DiagnosisReport';
import type { AudioAnalysisData, MasteringParams, MasteringTarget } from '../../types';

interface LPProps {
  language: 'ja' | 'en';
  // Hero
  onFileChange: (file: File | null) => void;
  fileName: string | null | undefined;
  isAnalyzing: boolean;
  isMastering: boolean;
  pyodideStatus: string;
  error: string;
  onErrorRetry: () => void;
  // Real flow (when file uploaded)
  audioFile: File | null;
  analysisData: AudioAnalysisData | null;
  masteringParams: MasteringParams | null;
  masteringTarget: MasteringTarget;
  onTargetChange: (t: MasteringTarget) => void;
  onExecuteMastering: () => void;
  onOpenResults: () => void;
  onResetUpload: () => void;
  // Auth / mypage
  session: { user: unknown } | null;
  onMypageClick: () => void;
  // Pricing
  onPerTrackSelect: () => void;
  onMonthlySelect: () => void;
}

export default function LP({
  language,
  onFileChange,
  fileName,
  isAnalyzing,
  isMastering,
  pyodideStatus,
  error,
  onErrorRetry,
  audioFile,
  analysisData,
  masteringParams,
  masteringTarget,
  onTargetChange,
  onExecuteMastering,
  onOpenResults,
  onResetUpload,
  session,
  onMypageClick,
  onPerTrackSelect,
  onMonthlySelect,
}: LPProps) {
  const hasFile = !!audioFile;
  const isProcessing = isAnalyzing || isMastering;

  const scrollToYourTrack = React.useCallback(() => {
    requestAnimationFrame(() => {
      const el = document.getElementById('your-track');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  useEffect(() => {
    if (hasFile && analysisData && !masteringParams) {
      scrollToYourTrack();
    }
  }, [hasFile, analysisData, masteringParams, scrollToYourTrack]);

  useEffect(() => {
    if (hasFile && analysisData && masteringParams) {
      scrollToYourTrack();
    }
  }, [hasFile, analysisData, masteringParams, scrollToYourTrack]);

  return (
    <>
      <LPHeader onMypageClick={onMypageClick} showMypage={!!session?.user} />

      <main className="min-h-screen pt-16">
        <section id="hero" className="scroll-mt-24 relative overflow-hidden pt-12 pb-12 md:pt-16 md:pb-16">
          <ReferenceHero
            language={language}
            onFileChange={onFileChange}
            fileName={fileName}
            isAnalyzing={isProcessing}
            pyodideStatus={pyodideStatus}
            error={error}
            onErrorRetry={onErrorRetry}
          />
        </section>

        <GenreNoticeSection />

        {hasFile && (
          <section id="your-track" className="scroll-mt-20 border-t border-border/50 py-16 md:py-20">
            <div className="mx-auto max-w-4xl px-4">
              {isProcessing && (
                <>
                  {isAnalyzing && <StatusLoader mode="analysis" />}
                  {isMastering && <StatusLoader mode="mastering" />}
                </>
              )}
              {!isProcessing && analysisData && !masteringParams && (
                <DiagnosisReport
                  data={analysisData}
                  target={masteringTarget}
                  onTargetChange={onTargetChange}
                  onExecute={onExecuteMastering}
                  onChooseOtherFile={onResetUpload}
                  isMastering={false}
                  language={language}
                />
              )}
              {!isProcessing && analysisData && masteringParams && (
                <div className="rounded-2xl border border-border bg-card/80 p-6 text-center shadow-lg md:p-8">
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/30 px-3 py-1.5 mb-4">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">
                      {language === 'ja' ? 'マスタリング完了' : 'Mastering Complete'}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-foreground md:text-xl">
                    {language === 'ja' ? '仕上がりを聴いてからダウンロード' : 'Listen, then download'}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {language === 'ja' ? '結果を見て購入・ダウンロード' : 'View result and purchase or download'}
                  </p>
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={onOpenResults}
                      className="animate-pulse-glow rounded-xl bg-primary px-8 py-3.5 font-bold text-primary-foreground hover:brightness-110 shadow-lg"
                    >
                      {language === 'ja' ? '結果を見る（聴く・購入）' : 'View result (listen & purchase)'}
                    </button>
                    <button
                      type="button"
                      onClick={onResetUpload}
                      className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
                    >
                      {language === 'ja' ? '別のファイルを選ぶ' : 'Choose another file'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <SocialProofSection />
        <HowItWorksSection />
        <FeaturesSection />
        <AlgorithmSection />
        <MasteringDemoSection />
        <PricingSection onPerTrackSelect={onPerTrackSelect} onMonthlySelect={onMonthlySelect} />
        <ChangelogSection />
        <FaqSection />
        <FinalCtaSection />
        <LPFooter />
      </main>
    </>
  );
}
