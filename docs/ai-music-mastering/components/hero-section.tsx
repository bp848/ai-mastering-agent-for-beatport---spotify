"use client"

import { Upload, ArrowRight, Zap, Shield, Music } from "lucide-react"
import { useCallback, useState, useRef } from "react"

export function HeroSection() {
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      setFileName(file.name)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFileName(file.name)
    }
  }, [])

  return (
    <section id="hero" className="relative overflow-hidden pt-24 pb-16 md:pt-32 md:pb-24">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4">
        {/* Top badge */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-xs font-medium text-primary">
              今だけ1曲無料 - 登録不要・クレカ不要
            </span>
          </div>
        </div>

        {/* Headline */}
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
            あなたの曲を
            <br />
            <span className="text-primary">チャート上位の音圧</span>
            に仕上げる
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-muted-foreground md:text-lg">
            WAVをアップロードするだけ。AIが配信基準を自動解析し、
            配信・YouTube・DJプレイに最適化されたマスタリングを30秒で完了。
          </p>
          <div className="mx-auto mt-4 flex flex-wrap items-center justify-center gap-2">
            {["配信リリース", "YouTube / MV", "DJプレイ", "ライブPA"].map((tag) => (
              <span key={tag} className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Stats row - social proof */}
        <div className="mx-auto mt-8 flex max-w-lg items-center justify-center gap-6 md:gap-10">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground md:text-3xl">4,700+</div>
            <div className="text-xs text-muted-foreground">曲を処理済み</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground md:text-3xl">30秒</div>
            <div className="text-xs text-muted-foreground">処理時間</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground md:text-3xl">0円</div>
            <div className="text-xs text-muted-foreground">初回無料</div>
          </div>
        </div>

        {/* Upload CTA area */}
        <div className="mx-auto mt-10 max-w-xl">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`group cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all md:p-12 ${
              isDragging
                ? "border-primary bg-primary/15 shadow-[0_0_30px_hsl(180_100%_50%/0.2)]"
                : fileName
                ? "border-primary/60 bg-primary/10 shadow-[0_0_20px_hsl(180_100%_50%/0.1)]"
                : "border-primary/40 bg-primary/5 shadow-[0_0_15px_hsl(180_100%_50%/0.08)] hover:border-primary/70 hover:bg-primary/10 hover:shadow-[0_0_25px_hsl(180_100%_50%/0.15)]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".wav,.mp3,.aiff,.flac"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Upload audio file"
            />

            {fileName ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                  <Music className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{fileName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    クリックして別のファイルを選択
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="animate-float flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/15 shadow-[0_0_20px_hsl(180_100%_50%/0.2)] transition-transform group-hover:scale-110">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">
                    ここに音源をドロップ
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    WAV / MP3 / AIFF 対応 (24bit/44.1kHz以上推奨)
                  </p>
                  <p className="mt-0.5 text-xs text-primary/70">
                    クリックしてファイルを選択することもできます
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Main CTA button */}
          <button
            className="animate-pulse-glow mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-bold text-primary-foreground transition-all hover:brightness-110 md:text-lg"
          >
            <Zap className="h-5 w-5" />
            無料でAIマスタリングを開始
            <ArrowRight className="h-5 w-5" />
          </button>

          {/* Trust signals under CTA */}
          <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" />
              登録不要
            </span>
            <span>|</span>
            <span>クレジットカード不要</span>
            <span>|</span>
            <span>すぐに聴ける</span>
          </div>
        </div>
      </div>
    </section>
  )
}
