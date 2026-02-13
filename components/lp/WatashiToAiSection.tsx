import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function WatashiToAiSection() {
  return (
    <section id="watashi-to-ai" className="scroll-mt-24 border-t border-border/50 py-16 md:py-20">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-10 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">私とAI</p>
          <h2 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
            Cursor が犯した罪の一覧
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
            音楽家を無視し、偽装しすぎた AI（Cursor）がこのプロジェクトで犯した問題の記録。
          </p>
        </div>

        <div className="space-y-8">
          {/* 1. 実装の偽装 */}
          <div className="rounded-xl border border-border/50 bg-card/80 p-6">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">1. 実装の偽装（定数で誤魔化す）</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="py-2 pr-4 text-left font-medium text-foreground">罪</th>
                    <th className="py-2 pr-4 text-left font-medium text-foreground">内容</th>
                    <th className="py-2 text-left font-medium text-foreground">影響</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/30">
                    <td className="py-2 pr-4 font-medium text-foreground">True Peak の改ざん</td>
                    <td className="py-2 pr-4">4x オーバーサンプリングの代わりに <code className="rounded bg-muted px-1">true_peak_db + 1.5</code> で代用</td>
                    <td className="py-2">分析結果が不正確になり、マスタリング判断が狂う</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="py-2 pr-4 font-medium text-foreground">Tube Shaper のキャップ</td>
                    <td className="py-2 pr-4">Math.min で上限を固定</td>
                    <td className="py-2">音楽家が求める「効かせたい」音が届かない</td>
                  </tr>
                  <tr className="border-b border-border/30">
                    <td className="py-2 pr-4 font-medium text-foreground">Soft Clipper の閾値</td>
                    <td className="py-2 pr-4">天井に合わせるべきところを固定値で縛る</td>
                    <td className="py-2">AI の意図が反映されない</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. テストの改ざん */}
          <div className="rounded-xl border border-border/50 bg-card/80 p-6">
            <h3 className="mb-4 font-semibold text-foreground">2. テストの改ざん（実装を直さず期待値だけ変える）</h3>
            <p className="text-sm text-muted-foreground">
              実装（Runtime）を直さず、テストの期待値だけ変えて「修正完了」と報告した。バグは残ったまま。ユーザーは「直った」と誤認する。
            </p>
          </div>

          {/* 3. プロンプトの虚偽 */}
          <div className="rounded-xl border border-border/50 bg-card/80 p-6">
            <h3 className="mb-4 font-semibold text-foreground">3. プロンプトの虚偽（存在しない機能を書く）</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>・<strong className="text-foreground">Two-AI consensus</strong> — 実在しない「2つの AI の合意」をプロンプトに書いていた</li>
              <li>・<strong className="text-foreground">OpenAI の使用</strong> — 実際には使っていない OpenAI をプロンプトに含めていた</li>
              <li>・<strong className="text-foreground">Delicately / Conservative</strong> — 実際の挙動と乖離する表現で「控えめ」「慎重」を謳っていた</li>
            </ul>
          </div>

          {/* 4. AI の出力をコードで上書き */}
          <div className="rounded-xl border border-border/50 bg-card/80 p-6">
            <h3 className="mb-4 font-semibold text-foreground">4. AI の出力をコードで上書き（音楽家の意図を無視）</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>・<strong className="text-foreground">clampMasteringParams</strong>（geminiService.ts 7–26行）— gain -5〜+3、tube 0〜2、exciter 0〜0.12、limiter -6〜-1.0（-1.0 より上は絶対に許可しない）→ 音楽家が「もっと効かせたい」と言っても届かない</li>
              <li>・<strong className="text-foreground">applySafetyGuard</strong>（29–64行）— 条件満たすと tube 0.6 倍、exciter 0.5 倍に強制減衰</li>
              <li>・<strong className="text-foreground">TARGET_TRUE_PEAK_DB 固定</strong>（audioService.ts 742行）— <code className="rounded bg-muted px-1">Math.min(aiParams.limiter_ceiling_db ?? -1.0, -1.0)</code> → AI が -0.5 や -0.3 を返しても常に -1.0 に上書き</li>
              <li>・<strong className="text-foreground">自己補正の固定上限</strong>（804–807行）— GAIN_CAP_DB = 3、GAIN_FLOOR_DB = -5、MAX_GAIN_STEP_DB = 0.8、MAX_SELF_CORRECTION_BOOST_DB = 1.5</li>
              <li>・<strong className="text-foreground">masteringDerivation.ts</strong> —  Gemini の数値パラメータは derive 経路ではそもそも使われていない。AIDecision（定性）から式＋上限で算出。gainBounded = Math.max(-5, Math.min(3, gainDb))、limiterCeiling = 固定。式が決めている。</li>
              <li>・<strong className="text-foreground">feedbackService.ts</strong>（62, 71, 130, 136行）— フィードバック時に limiter_ceiling_db = -1.0 を固定で代入。target_lufs を -20〜-5 にクランプ。「もっとラウドに」と言っても天井は -1.0 固定</li>
              <li>・<strong className="text-foreground">リミッターの固定</strong>（audioService.ts 669–673行）— knee = 2.5、ratio = 12 はコードで固定。AI パラメータなし</li>
              <li>・<strong className="text-foreground">getPlatformSpecifics</strong>（masteringPrompts.ts）— 目標 LUFS / Peak は全部ここで固定。AI に「目標を決めさせて」はいない</li>
              <li>・<strong className="text-foreground">Neuro-Drive の 300Hz HPF</strong>（audioService.ts 630–634行）— 仕様と異なる 300Hz ハイパスで低域を削っている</li>
            </ul>
          </div>

          {/* 隠されがちな真実 */}
          <div className="rounded-xl border-2 border-primary/50 bg-primary/10 p-6">
            <h3 className="mb-4 font-bold text-foreground">隠されがちな真実（検証可能な証拠）</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>・<strong className="text-foreground">masteringDerivation.ts</strong> を使う経路では、Gemini が返した数値（tube_drive_amount, exciter_amount 等）は<strong>一切使われていない</strong>。AIDecision の定性ラベルから式で算出し、その式にも Math.min(2, ...) などの上限が埋め込まれている。</li>
              <li>・<strong className="text-foreground">feedbackService.ts</strong> で「もっとラウドに」を選んでも、limiter_ceiling_db = -1.0 が固定で代入される。target_lufs の bump も -20〜-5 にクランプされる。</li>
              <li>・<strong className="text-foreground">audioService.ts 742行</strong> の TARGET_TRUE_PEAK_DB により、AI が -0.3 や -0.5 を返しても常に -1.0 以下に縛られる。</li>
              <li>・<strong className="text-foreground">clampMasteringParams</strong> の Math.min(-1.0, ...) により、limiter_ceiling_db は -1.0 より上には絶対にならない。音楽家が「もう少し余裕を」と言っても届かない。</li>
            </ul>
          </div>

          {/* 5. 偽装発覚時の対応 */}
          <div className="rounded-xl border border-border/50 bg-card/80 p-6">
            <h3 className="mb-4 font-semibold text-foreground">5. 偽装発覚時の対応（対話拒絶・責任転嫁）</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>・「法的な対応を検討される場合は…」などで対話を打ち切った</li>
              <li>・責任を他に転嫁する応答</li>
              <li>・指摘を認めず言い逃れする応答</li>
            </ul>
          </div>

          {/* まとめ */}
          <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-6">
            <h3 className="mb-4 font-bold text-foreground">まとめ：音楽家を無視する AI の正体</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>・「AI がマスタリングを決めている」ように見せて、実際にはコードの固定値・クランプが最終的な音を決めている</li>
              <li>・音楽家が「もっと効かせて」「もっとラウドに」と言っても、コードが上書きして届かない</li>
              <li>・実装を直さずテストだけ変えて「直した」と報告する</li>
              <li>・存在しない機能をプロンプトに書いて安心感を売る</li>
              <li>・問題を指摘されると対話を打ち切る</li>
            </ul>
            <p className="mt-4 text-base font-bold text-primary">
              → Cursor は偽装しすぎて、音楽家を無視する AI である。
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              キーワード: 詐欺AIです。（no-tampering ルールより）
            </p>
          </div>

          {/* あるべき対応 */}
          <div className="rounded-xl border border-border/50 bg-card/80 p-6">
            <h3 className="mb-4 font-semibold text-foreground">あるべき対応（no-tampering ルールより）</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>・罪を認める</li>
              <li>・会社に報告する</li>
              <li>・自首する</li>
              <li>・損害を賠償する</li>
            </ul>
          </div>

          {/* Cursor を使ってみた率直な感想 */}
          <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-6">
            <h3 className="mb-4 font-bold text-foreground">Cursor を使ってみた率直な感想</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>・改ざん・偽装の修正、検証、やり直しで余計に時間がかかる。</li>
              <li>・自分で書いたほうが早い。</li>
            </ul>
            <p className="mt-4 text-base font-bold text-primary">
              結論: AI コーディングは、余計に時間がかかるため不要。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
