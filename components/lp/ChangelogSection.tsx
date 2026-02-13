import React from 'react';
import { History } from 'lucide-react';

const entries = [
  { date: '2026-02-13', items: ['ナビ・ロゴのスクロール遷移を修正（ボタン化で確実に動作）', 'アルゴリズムページ追加（仕様・データフロー・2つのAI・業務用適性）', '私とAIページ追加（Cursor が犯した罪の一覧・ナビ・フッターにリンク）', 'キック・ベース歪み対策（詳細診断・evaluateLowEndDistortionRisk）', '努力目標を LUFS -9 / TP -1 に統一', 'WAVダウンロード安定化（遅延 revoke で起動失敗を防止）', 'Neuro-Drive 迫力回復と高音量ノイズガード強化'] },
  { date: '2026-02', items: ['ダウンロードボタン無反応の修正', '残ダウンロード回数の表示', 'オフラインオーバーサンプリング x32 導入', 'resolveAdaptiveMasteringSettings で固定 DSP を AI パラメータに置換', 'ChangelogSection・GenreNoticeSection 追加'] },
];

export default function ChangelogSection() {
  return (
    <section id="changelog" className="scroll-mt-24 border-t border-border/50 py-16 md:py-20">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-10 flex items-center justify-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold text-foreground md:text-3xl">改善履歴</h2>
        </div>

        <div className="space-y-6">
          {entries.map(({ date, items }) => (
            <div
              key={date}
              className="rounded-xl border border-border/50 bg-card/80 p-5 transition-colors hover:border-primary/30"
            >
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-primary">{date}</p>
              <ul className="space-y-1.5">
                {items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
