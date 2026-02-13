"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

// ─── Data ─────────────────────────────────────────────

const targets = [
  { id: "beatport", label: "Club Store (Techno/Trance)", lufs: -8 },
  { id: "spotify", label: "Spotify (Streaming)", lufs: -14 },
  { id: "youtube", label: "YouTube / MV", lufs: -14 },
  { id: "dj", label: "DJ Play", lufs: -8 },
] as const

const originalMetrics = [
  { label: "ラウドネス", value: "-15.5 LUFS", target: "-8", status: "fail" as const },
  { label: "トゥルーピーク", value: "-5.5 dBTP", target: "-0.3", status: "ok" as const },
  { label: "ダイナミクス", value: "11.1", target: "6-10", status: "good" as const },
  { label: "位相相関", value: "0.990", target: ">0.5", status: "ok" as const },
  { label: "歪み", value: "0.06%", target: "<0.15", status: "clean" as const },
  { label: "ノイズフロア", value: "-65.1 dB", target: "< -60", status: "ok" as const },
  { label: "ステレオ幅", value: "11%", target: "<50%", status: "narrow" as const },
]

const masteredMetrics = [
  { label: "ラウドネス", value: "-7.8 LUFS", target: "-8", status: "ok" as const },
  { label: "トゥルーピーク", value: "-0.1 dBTP", target: "-0.3", status: "ok" as const },
  { label: "ダイナミクス", value: "8.2", target: "6-10", status: "good" as const },
  { label: "位相相関", value: "0.985", target: ">0.5", status: "ok" as const },
  { label: "歪み", value: "0.04%", target: "<0.15", status: "clean" as const },
  { label: "ノイズフロア", value: "-68.3 dB", target: "< -60", status: "ok" as const },
  { label: "ステレオ幅", value: "32%", target: "<50%", status: "ok" as const },
]

const processingLogs = [
  { prefix: "BOOT", text: "Hybrid-Analog Engine を初期化中...", color: "text-muted-foreground" },
  { prefix: "LOAD", text: "ファイル: untitled (1).wav (13.67 MB)", color: "text-muted-foreground" },
  { prefix: "FFT", text: "周波数スペクトル解析 (FFT)... [fft_analysis]", color: "text-muted-foreground" },
  { prefix: "CALC", text: "ラウドネス計測: -15.51 LUFS → 目標 -8 まで +7.5 dB", color: "text-primary" },
  { prefix: "PEAK", text: "トゥルーピーク: -5.47 dBTP", color: "text-foreground" },
  { prefix: "PHASE", text: "位相相関検出: 0.990 [Phase_Detector]", color: "text-foreground" },
  { prefix: "NOISE", text: "ノイズフロア: -65.1 dB [Noise_Gate]", color: "text-foreground" },
  { prefix: "DONE", text: "構造分析完了 → 診断レポートを生成します。", color: "text-primary" },
  { prefix: "APPLY", text: "真空管サチュレーションとPultec EQを適用...", color: "text-primary" },
  { prefix: "SPACE", text: "M/S処理でステレオ空間を拡張中...", color: "text-primary" },
  { prefix: "INJECT", text: "Neuro-Driveモジュール: エネルギー密度を注入...", color: "text-primary" },
  { prefix: "LIMIT", text: "Limiter + Brickwall 適用 → -1.0 dB ceiling", color: "text-primary" },
  { prefix: "OK", text: "マスタリング完了。プレビューを生成中...", color: "text-emerald-400" },
]

const masteringChain = [
  "TUBE SAT | 0.6",
  "PULTEC EQ | ON",
  "EQ | 2-BAND",
  "EXCITER | 0.08",
  "M/S WIDTH | 1.18X",
  "GLUE COMP | ON",
  "NEURO-DRIVE | 35%",
  "SOFT CLIP | ON",
  "LIMITER | -1.0 dB",
]

// ─── Helpers ──────────────────────────────────────────

function statusColor(s: string) {
  switch (s) {
    case "fail": return "text-red-400"
    case "ok": return "text-primary"
    case "good": return "text-emerald-400"
    case "clean": return "text-emerald-400"
    case "narrow": return "text-amber-400"
    default: return "text-muted-foreground"
  }
}

function statusLabel(s: string) {
  switch (s) {
    case "fail": return "要対応"
    case "ok": return "OK"
    case "good": return "良好"
    case "clean": return "Clean"
    case "narrow": return "適正"
    default: return ""
  }
}

// ─── Step Views ────────────────────────────────────────

type DemoStep = "analysis" | "processing" | "preview"

// ─── STEP 1: Analysis Results ──────────────────────────

function AnalysisView({ onNext }: { onNext: () => void }) {
  const [target, setTarget] = useState(0)
  const metrics = originalMetrics
  const failCount = metrics.filter((m) => m.status === "fail").length

  return (
    <div>
      {/* Target tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">配信先:</span>
        {targets.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setTarget(i)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              target === i
                ? "bg-primary text-primary-foreground"
                : "border border-border/50 bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Score badge row */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">診断サマリ</span>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[...Array(4)].map((_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full ${
                  i < 3 ? "bg-emerald-400" : i === 3 ? "bg-amber-400" : "bg-red-400"
                }`}
              />
            ))}
          </div>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
            75%
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
        <div className="grid grid-cols-4 gap-4 border-b border-border/50 bg-secondary/50 px-4 py-2.5 text-xs font-medium text-muted-foreground">
          <span>項目</span>
          <span>現状</span>
          <span>目標</span>
          <span className="text-right">判定</span>
        </div>
        {metrics.map((m) => (
          <div
            key={m.label}
            className="grid grid-cols-4 gap-4 border-b border-border/30 px-4 py-2.5 text-sm last:border-b-0"
          >
            <span className="font-medium text-foreground">{m.label}</span>
            <span className="font-mono text-foreground">{m.value}</span>
            <span className="text-muted-foreground">{m.target}</span>
            <span className={`text-right font-semibold ${statusColor(m.status)}`}>
              {statusLabel(m.status)}
            </span>
          </div>
        ))}
      </div>

      {/* Recommendation */}
      <div className="mt-4 rounded-xl border border-border/50 bg-card p-4">
        <p className="text-sm font-medium text-foreground">
          +7.5 dB のブースト、低域最適化、サチュレーションを適用します。
        </p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          Tube Sat → Pultec → M/S → Glue → Neuro-Drive → Limiter → Brickwall
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={onNext}
        className="animate-pulse-glow mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-sm font-bold text-primary-foreground transition-all hover:brightness-110 md:text-base"
      >
        AI マスタリングを実行する
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

// ─── STEP 2: Processing ────────────────────────────────

function ProcessingView({ onDone }: { onDone: () => void }) {
  const [visibleLogs, setVisibleLogs] = useState(0)
  const [progress, setProgress] = useState(0)
  const logContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleLogs((prev) => {
        if (prev >= processingLogs.length) {
          clearInterval(interval)
          return prev
        }
        return prev + 1
      })
      setProgress((prev) => {
        const target = Math.min(100, ((visibleLogs + 1) / processingLogs.length) * 100)
        return Math.min(target, 100)
      })
    }, 600)

    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleLogs])

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [visibleLogs])

  useEffect(() => {
    if (visibleLogs >= processingLogs.length) {
      const timeout = setTimeout(onDone, 1200)
      return () => clearTimeout(timeout)
    }
  }, [visibleLogs, onDone])

  const pct = Math.round((visibleLogs / processingLogs.length) * 100)

  return (
    <div className="flex flex-col items-center">
      {/* Spinner */}
      <div className="relative mb-6 h-16 w-16">
        <svg className="h-16 w-16 animate-spin" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(220 15% 18%)" strokeWidth="4" />
          <circle
            cx="32" cy="32" r="28" fill="none" stroke="hsl(180 100% 50%)" strokeWidth="4"
            strokeDasharray={`${pct * 1.76} ${176 - pct * 1.76}`}
            strokeLinecap="round"
            transform="rotate(-90 32 32)"
            className="transition-all duration-300"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary">
          {pct}%
        </span>
      </div>

      {/* Terminal logs */}
      <div className="w-full overflow-hidden rounded-xl border border-border/50 bg-[hsl(220_20%_5%)]">
        {/* Terminal header */}
        <div className="flex items-center justify-between border-b border-border/30 px-4 py-2">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">MASTERING_ENGINE</span>
          <span className="flex items-center gap-1.5 text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400">RUNNING</span>
          </span>
        </div>

        {/* Log lines */}
        <div
          ref={logContainerRef}
          className="max-h-64 overflow-y-auto p-4 font-mono text-xs leading-relaxed"
        >
          {processingLogs.slice(0, visibleLogs).map((log, i) => (
            <div key={i} className="flex gap-2">
              <span className="shrink-0 text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-muted-foreground">[{log.prefix}]</span>
              <span className={log.color}>{log.text}</span>
              {i < visibleLogs - 1 && (
                <span className="text-emerald-400 ml-auto shrink-0">
                  {log.prefix === "OK" ? "" : ""}
                </span>
              )}
            </div>
          ))}
          {visibleLogs < processingLogs.length && (
            <span className="inline-block h-4 w-2 animate-pulse bg-primary" />
          )}
        </div>
      </div>

      <p className="mt-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Processing audio chain...
      </p>
    </div>
  )
}

// ─── STEP 3: Preview & Purchase ─────────────────────────

function PreviewView({ onRestart }: { onRestart: () => void }) {
  const [activeTab, setActiveTab] = useState<"original" | "mastered">("mastered")
  const [isPlaying, setIsPlaying] = useState(false)
  const [waveformProgress, setWaveformProgress] = useState(0)
  const animRef = useRef<number | null>(null)

  const togglePlayback = useCallback(() => {
    setIsPlaying((prev) => !prev)
  }, [])

  useEffect(() => {
    if (isPlaying) {
      const start = Date.now()
      const animate = () => {
        const elapsed = Date.now() - start
        setWaveformProgress((prev) => {
          const next = prev + 0.15
          if (next >= 100) {
            setIsPlaying(false)
            return 0
          }
          return next
        })
        animRef.current = requestAnimationFrame(animate)
      }
      animRef.current = requestAnimationFrame(animate)
    } else {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [isPlaying])

  const metrics = activeTab === "mastered" ? masteredMetrics : originalMetrics

  return (
    <div>
      {/* Comparison header */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-primary">プレビュー → ダウンロード</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          まず再生で聴いてみて、気に入ったらマスタリングデータを購入 (1曲1,000円・ログイン必要)。
        </p>
      </div>

      {/* Before / After stats comparison */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border/50 bg-card p-3">
          <p className="text-[10px] font-medium text-muted-foreground">オリジナル [実測]</p>
          <div className="mt-1.5 space-y-0.5 font-mono text-sm text-foreground">
            <p>LUFS -15.5</p>
            <p>TP -5.5 dB</p>
            <p>Crest 11.1</p>
          </div>
        </div>
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
          <p className="text-[10px] font-medium text-primary">マスター [実測]</p>
          <div className="mt-1.5 space-y-0.5 font-mono text-sm text-foreground">
            <p>LUFS -7.8</p>
            <p>TP -0.1 dB</p>
            <p className="text-xs text-muted-foreground">目標 -8.0 LUFS</p>
          </div>
        </div>
      </div>

      {/* Playback controls */}
      <div className="rounded-xl border border-border/50 bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">聴き比べ</span>
          <span className="text-xs font-medium text-primary">
            現在再生: {activeTab === "mastered" ? "マスタリング後" : "オリジナル"}
          </span>
        </div>

        {/* Play button + toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlayback}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>
          <button
            onClick={() => setActiveTab("mastered")}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
              activeTab === "mastered"
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            聴く: マスタリング後
          </button>
          <button
            onClick={() => setActiveTab("original")}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
              activeTab === "original"
                ? "bg-secondary text-foreground"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            聴く: オリジナル
          </button>
        </div>

        {/* Waveform visualization */}
        <div className="mt-4">
          <div className="mb-1 flex items-center gap-2">
            <button
              onClick={() => setActiveTab("original")}
              className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                activeTab === "original"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              ORIGINAL
            </button>
            <button
              onClick={() => setActiveTab("mastered")}
              className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                activeTab === "mastered"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              AI MASTERED
            </button>
          </div>

          {/* Simulated waveform */}
          <div className="relative h-24 overflow-hidden rounded-lg bg-[hsl(220_20%_5%)]">
            <WaveformDisplay
              progress={waveformProgress}
              isMastered={activeTab === "mastered"}
            />
          </div>
        </div>

        {/* Peak meter */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>-inf dB</span>
            <span>リアルタイム ピーク</span>
            <span>0 dB</span>
          </div>
          <div className="mt-1 h-3 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-primary to-primary transition-all duration-300"
              style={{
                width: isPlaying
                  ? activeTab === "mastered" ? "85%" : "55%"
                  : "0%",
              }}
            />
          </div>
        </div>
      </div>

      {/* Mastering chain tags */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">適用済みモジュール</p>
        <div className="flex flex-wrap gap-1.5">
          {masteringChain.map((mod) => (
            <span
              key={mod}
              className="rounded-md border border-border/50 bg-card px-2 py-1 font-mono text-[10px] text-foreground"
            >
              {mod}
            </span>
          ))}
        </div>
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">
          WAV 16bit / 44.1kHz  05:14  57.7 MB
        </p>
      </div>

      {/* Retry & Purchase */}
      <div className="mt-6 rounded-xl border border-border/50 bg-card p-4">
        <h4 className="text-sm font-bold text-foreground">リトライする</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          音が割れている、音が歪んでいる、音がひずんでいる、音に力がない、音が細い。すべてやり直せ。
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            onClick={onRestart}
            className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-secondary/80"
          >
            <RotateCcw className="h-4 w-4" />
            再度マスタリングを実行（無料）
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110">
            <Download className="h-4 w-4" />
            購入してマイページでダウンロード（1000円）
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Waveform Component ─────────────────────────────────

function WaveformDisplay({ progress, isMastered }: { progress: number; isMastered: boolean }) {
  const bars = 120
  const amplitudes = useRef<number[]>([])

  if (amplitudes.current.length === 0) {
    // Deterministic pseudo-random waveform
    const seed = 42
    amplitudes.current = Array.from({ length: bars }, (_, i) => {
      const x = Math.sin(seed + i * 0.3) * 0.5 + 0.5
      const beat = Math.sin(i * 0.15) * 0.3
      return Math.max(0.08, Math.min(1, x * 0.7 + beat + 0.2))
    })
  }

  const playedBars = Math.floor((progress / 100) * bars)

  return (
    <div className="flex h-full items-center justify-center gap-px px-2">
      {amplitudes.current.map((amp, i) => {
        const height = isMastered ? amp * 85 + 15 : amp * 55 + 10
        const isPlayed = i < playedBars
        return (
          <div key={i} className="flex h-full items-center">
            <div
              className={`w-[2px] rounded-full transition-colors duration-150 ${
                isPlayed ? "bg-primary" : "bg-primary/25"
              }`}
              style={{ height: `${height}%` }}
            />
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Section ───────────────────────────────────────

export function MasteringDemoSection() {
  const [step, setStep] = useState<DemoStep>("analysis")

  const handleProcessingDone = useCallback(() => {
    setStep("preview")
  }, [])

  const handleRestart = useCallback(() => {
    setStep("analysis")
  }, [])

  const stepLabels: { key: DemoStep; label: string; num: string }[] = [
    { key: "analysis", label: "分析", num: "1" },
    { key: "processing", label: "実行", num: "2" },
    { key: "preview", label: "聴く・購入", num: "3" },
  ]

  return (
    <section id="before-after" className="border-t border-border/50 py-16 md:py-20">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            Live Demo
          </p>
          <h2 className="mt-2 text-balance text-2xl font-bold text-foreground md:text-3xl">
            アップロード後の体験をそのまま再現
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            分析 → AI処理 → プレビュー。実際のUI体験をこのページで確認できます。
          </p>
        </div>

        {/* Step indicator */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {stepLabels.map((s, i) => {
            const isActive = s.key === step
            const isPast =
              (step === "processing" && s.key === "analysis") ||
              (step === "preview" && (s.key === "analysis" || s.key === "processing"))
            return (
              <div key={s.key} className="flex items-center gap-2">
                {i > 0 && (
                  <div className={`h-px w-6 md:w-10 ${isPast || isActive ? "bg-primary" : "bg-border"}`} />
                )}
                <button
                  onClick={() => {
                    if (isPast) setStep(s.key)
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isPast
                      ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {isPast ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-current/20 text-[10px]">
                      {s.num}
                    </span>
                  )}
                  {s.label}
                </button>
              </div>
            )
          })}
        </div>

        {/* Step content */}
        <div className="rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm md:p-6">
          {step === "analysis" && <AnalysisView onNext={() => setStep("processing")} />}
          {step === "processing" && <ProcessingView onDone={handleProcessingDone} />}
          {step === "preview" && <PreviewView onRestart={handleRestart} />}
        </div>

        {/* Nav hint */}
        <div className="mt-4 flex items-center justify-between">
          {step !== "analysis" ? (
            <button
              onClick={() => setStep(step === "preview" ? "processing" : "analysis")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              前へ
            </button>
          ) : (
            <div />
          )}
          {step !== "preview" ? (
            <button
              onClick={() => setStep(step === "analysis" ? "processing" : "preview")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              次へ
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <a
              href="#hero"
              className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
            >
              自分の曲で試す
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
