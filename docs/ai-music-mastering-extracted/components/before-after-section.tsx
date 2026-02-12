"use client"

import { useState } from "react"
import { ArrowRight, CheckCircle2, AlertCircle } from "lucide-react"

const beforeMetrics = [
  { label: "ラウドネス", value: "-15.5 LUFS", target: "-8 LUFS", status: "fail" as const },
  { label: "トゥルーピーク", value: "-5.5 dBTP", target: "-0.3 dBTP", status: "ok" as const },
  { label: "ダイナミクス", value: "11.1", target: "6-10", status: "good" as const },
  { label: "位相相関", value: "0.990", target: ">0.5", status: "ok" as const },
  { label: "歪み", value: "0.06%", target: "<0.15", status: "clean" as const },
  { label: "ノイズフロア", value: "-65.1 dB", target: "< -60", status: "ok" as const },
  { label: "ステレオ幅", value: "11%", target: "<50%", status: "narrow" as const },
]

const afterMetrics = [
  { label: "ラウドネス", value: "-7.8 LUFS", target: "-8 LUFS", status: "ok" as const },
  { label: "トゥルーピーク", value: "-0.1 dBTP", target: "-0.3 dBTP", status: "ok" as const },
  { label: "ダイナミクス", value: "8.2", target: "6-10", status: "good" as const },
  { label: "位相相関", value: "0.985", target: ">0.5", status: "ok" as const },
  { label: "歪み", value: "0.04%", target: "<0.15", status: "clean" as const },
  { label: "ノイズフロア", value: "-68.3 dB", target: "< -60", status: "ok" as const },
  { label: "ステレオ幅", value: "32%", target: "<50%", status: "ok" as const },
]

function statusColor(status: string) {
  switch (status) {
    case "fail": return "text-red-400"
    case "ok": return "text-primary"
    case "good": return "text-emerald-400"
    case "clean": return "text-emerald-400"
    case "narrow": return "text-amber-400"
    default: return "text-muted-foreground"
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "fail": return "要対応"
    case "ok": return "OK"
    case "good": return "良好"
    case "clean": return "Clean"
    case "narrow": return "適正"
    default: return ""
  }
}

export function BeforeAfterSection() {
  const [view, setView] = useState<"before" | "after">("before")
  const metrics = view === "before" ? beforeMetrics : afterMetrics
  const failCount = metrics.filter((m) => m.status === "fail").length

  return (
    <section id="before-after" className="border-t border-border/50 py-16 md:py-20">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-10 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            Diagnostic Demo
          </p>
          <h2 className="mt-2 text-balance text-2xl font-bold text-foreground md:text-3xl">
            アップロード前後でここまで変わる
          </h2>
        </div>

        {/* Toggle */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setView("before")}
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
              view === "before"
                ? "bg-card border border-border text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ORIGINAL
          </button>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <button
            onClick={() => setView("after")}
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
              view === "after"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            AI MASTERED
          </button>
        </div>

        {/* Score */}
        <div className="mb-6 flex items-center justify-center gap-4">
          <div className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold ${
            view === "after"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
              : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
          }`}>
            {view === "after" ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                配信基準スコア: 100% - 全項目クリア
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4" />
                配信基準スコア: 75% - {failCount}項目が要対応
              </>
            )}
          </div>
        </div>

        {/* Metrics table */}
        <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
          <div className="grid grid-cols-4 gap-4 border-b border-border/50 bg-secondary/50 px-5 py-3 text-xs font-medium text-muted-foreground">
            <span>項目</span>
            <span>現状</span>
            <span>目標</span>
            <span className="text-right">判定</span>
          </div>
          {metrics.map((m) => (
            <div
              key={m.label}
              className="grid grid-cols-4 gap-4 border-b border-border/30 px-5 py-3 text-sm last:border-b-0"
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

        {/* Applied chain (after only) */}
        {view === "after" && (
          <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs font-medium text-primary">適用されたマスタリングチェーン</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {["TUBE SAT | 0.6", "PULTEC EQ | ON", "EQ | 2-BAND", "EXCITER | 0.08", "M/S WIDTH | 1.18X", "GLUE COMP | ON", "NEURO-DRIVE | 35%", "SOFT CLIP | ON", "LIMITER | -1.0 dB"].map((mod) => (
                <span
                  key={mod}
                  className="rounded-md border border-border/50 bg-card px-2.5 py-1 font-mono text-xs text-foreground"
                >
                  {mod}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 text-center">
          <a
            href="#hero"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground transition-all hover:brightness-110"
          >
            自分の曲で無料診断する
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  )
}
