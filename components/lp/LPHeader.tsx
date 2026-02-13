import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

const navLinks: { label: string; href: string; external?: boolean }[] = [
  { label: '使い方', href: '#how-it-works' },
  { label: '特徴', href: '#features' },
  { label: 'アルゴリズム', href: '#algorithm' },
  { label: '率直な感想', href: '/cursor-impressions.html', external: true },
  { label: 'デモ', href: '#before-after' },
  { label: '料金', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
  { label: 'レビュー', href: '#reviews' },
];

interface LPHeaderProps {
  onMypageClick?: () => void;
  showMypage?: boolean;
}

export default function LPHeader({ onMypageClick, showMypage }: LPHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollTo = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, href: string) => {
    e.preventDefault();
    setMobileOpen(false);
    if (!href.startsWith('#')) return;
    const id = href.slice(1);
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={(e) => scrollTo(e, '#hero')}
          className="flex items-center gap-2 bg-transparent border-none p-0 cursor-pointer text-inherit"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/30 bg-primary/10">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-primary">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Dance Music Mastering AI
          </span>
        </button>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ) : (
              <button
                key={link.href}
                type="button"
                onClick={(e) => scrollTo(e, link.href)}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground bg-transparent border-none p-0 cursor-pointer font-inherit"
              >
                {link.label}
              </button>
            )
          )}
          {showMypage && onMypageClick && (
            <button
              type="button"
              onClick={() => { onMypageClick(); setMobileOpen(false); }}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              マイページ
            </button>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => scrollTo(e, '#hero')}
            className="hidden rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 md:inline-flex"
          >
            1曲無料で試す
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-foreground md:hidden"
            aria-label="メニュー"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border/50 bg-background/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1 px-4 py-3">
            {navLinks.map((link) =>
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground w-full"
                >
                  {link.label}
                </a>
              ) : (
                <button
                  key={link.href}
                  type="button"
                  onClick={(e) => scrollTo(e, link.href)}
                  className="rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground w-full bg-transparent border-none cursor-pointer font-inherit"
                >
                  {link.label}
                </button>
              )
            )}
            {showMypage && onMypageClick && (
              <button
                type="button"
                onClick={() => { onMypageClick(); setMobileOpen(false); }}
                className="rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground w-full bg-transparent border-none cursor-pointer font-inherit"
              >
                マイページ
              </button>
            )}
            <button
              type="button"
              onClick={(e) => scrollTo(e, '#hero')}
              className="mt-2 rounded-lg bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground w-full border-none cursor-pointer"
            >
              1曲無料で試す
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
