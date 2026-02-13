import React from 'react';
import { Cpu, GitBranch, Bot, Building2 } from 'lucide-react';

export default function AlgorithmSection() {
  return (
    <section id="algorithm" className="scroll-mt-24 border-t border-border/50 py-16 md:py-20">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-10 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">Algorithm</p>
          <h2 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
            仕様・データフロー・AI構成
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
            物理モデリングとAIのハイブリッド。プロの判断をアルゴリズムで再現し、業務品質を保証します。
          </p>
        </div>

        <div className="space-y-8">
          {/* 仕様 */}
          <div className="rounded-xl border border-border/50 bg-card/80 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">仕様（Spec）</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>・入力: WAV / MP3 / AIFF / FLAC（2mix推奨）</li>
              <li>・出力: WAV 16/24bit、LUFS -9（Beatport） / -14（Spotify）</li>
              <li>・DSPチェーン: Tube Sat → Pultec → M/S → Glue → Neuro-Drive → Limiter → Brickwall</li>
              <li>・分析: LUFS / トゥルーピーク / ダイナミクス / 位相 / 歪み / ノイズ / ステレオ幅 / 低域詳細診断</li>
              <li>・安全制御: キック・ベース歪みリスク評価、過大ゲイン抑制、プラットフォーム別天井</li>
            </ul>
          </div>

          {/* データフロー */}
          <div className="rounded-xl border border-border/50 bg-card/80 p-6">
            <div className="mb-4 flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">データフロー（Data Flow）</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="shrink-0 rounded bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">1</span>
                <span><strong>アップロード</strong> → Web Audio API でデコード</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="shrink-0 rounded bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">2</span>
                <span><strong>分析</strong> → Pyodide (numpy, scipy, pyloudnorm) で FFT・LUFS・位相・歪み・低域診断を算出</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="shrink-0 rounded bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">3</span>
                <span><strong>AI #1（Gemini）</strong> → 分析値から AIDecision（サチュレーション量・EQ・ステレオ意図など）を導出</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="shrink-0 rounded bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">4</span>
                <span><strong>AI #2（導出ロジック）</strong> → AIDecision + 分析値から DSP パラメータ（gain, tube, exciter, contour, width 等）を算出</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="shrink-0 rounded bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">5</span>
                <span><strong>自己補正</strong> → 10秒シミュレーションで LUFS を検証し、ゲインを微調整</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="shrink-0 rounded bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">6</span>
                <span><strong>DSP 適用</strong> → Web Audio API でマスタリング実行 → WAV エクスポート</span>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                ※ AI #3（予定）: スタイル・ジャンル別の微調整や、マルチトラック前提の高度な判断を追加予定
              </p>
            </div>
          </div>

          {/* AI構成 */}
          <div className="rounded-xl border border-border/50 bg-card/80 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">AI 構成（2つ稼働 / 3つ予定）</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="text-xs font-bold text-primary">AI #1</p>
                <p className="mt-1 text-sm font-medium text-foreground">Gemini Pro</p>
                <p className="mt-1 text-xs text-muted-foreground">分析値からマスタリング意図（AIDecision）を生成。EQ・サチュレーション・ステレオ幅の方向性を決定。</p>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="text-xs font-bold text-primary">AI #2</p>
                <p className="mt-1 text-sm font-medium text-foreground">導出ロジック</p>
                <p className="mt-1 text-xs text-muted-foreground">AIDecision + 分析値から具体的な DSP パラメータを算出。低域歪みリスク評価で安全制御。</p>
              </div>
              <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 opacity-80">
                <p className="text-xs font-bold text-muted-foreground">AI #3（予定）</p>
                <p className="mt-1 text-sm font-medium text-foreground">スタイル最適化</p>
                <p className="mt-1 text-xs text-muted-foreground">ジャンル・スタイル別の微調整、マルチトラック前提の高度な判断を追加予定。</p>
              </div>
            </div>
          </div>

          {/* 業務用適性 */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">業務用適性</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>・<strong>再現性</strong>: 同じ入力 → 同じ分析 → 同じパラメータ導出。バッチ処理・自動化に適する</li>
              <li>・<strong>トレーサビリティ</strong>: 分析値・AIDecision・DSPパラメータをログ出力可能。品質管理に活用</li>
              <li>・<strong>安全制御</strong>: キック・ベース歪みリスク、過大ゲイン、プラットフォーム天井を自動抑制</li>
              <li>・<strong>スケーラビリティ</strong>: クライアント側 DSP でサーバ負荷を抑え、大量処理にも対応可能</li>
              <li>・<strong>API 化の余地</strong>: 分析・導出・DSP をモジュール化しており、REST/Edge 化しやすい設計</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
