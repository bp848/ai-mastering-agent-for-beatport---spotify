import React from 'react';

export default function LPFooter() {
  return (
    <footer className="border-t border-border/50 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 md:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md border border-primary/30 bg-primary/10">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-primary">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-xs text-muted-foreground">
            ALGORITHM MUSIC TOKYO &copy; {new Date().getFullYear()}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <a href="/operator.html" target="_blank" rel="noreferrer" className="transition-colors hover:text-foreground">運営者情報</a>
          <a href="/terms.html" target="_blank" rel="noreferrer" className="transition-colors hover:text-foreground">利用規約</a>
          <a href="/privacy.html" target="_blank" rel="noreferrer" className="transition-colors hover:text-foreground">プライバシー</a>
          <a href="/refund.html" target="_blank" rel="noreferrer" className="transition-colors hover:text-foreground">返金ポリシー</a>
          <span className="text-muted-foreground/60">v1.0.0</span>
        </div>
      </div>
    </footer>
  );
}
