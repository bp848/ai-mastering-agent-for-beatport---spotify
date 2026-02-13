"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"

const navLinks = [
  { label: "使い方", href: "#how-it-works" },
  { label: "特徴", href: "#features" },
  { label: "デモ", href: "#before-after" },
  { label: "料金", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
  { label: "レビュー", href: "#reviews" },
]

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <a href="#" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 border border-primary/30">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-primary">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-foreground tracking-tight">
            Dance Music Mastering AI
          </span>
        </a>

        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="#hero"
            className="hidden rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 md:inline-flex"
          >
            1曲無料で試す
          </a>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-foreground md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border/50 bg-background/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1 px-4 py-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#hero"
              onClick={() => setMobileOpen(false)}
              className="mt-2 rounded-lg bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground"
            >
              1曲無料で試す
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
