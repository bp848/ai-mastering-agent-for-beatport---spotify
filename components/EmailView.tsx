import React, { useState, useCallback } from 'react';
import { usePlatform } from '../contexts/PlatformContext';
import { MailIcon, DownloadIcon, TrashIcon } from './Icons';

export default function EmailView() {
  const { emailContacts, addEmail, removeEmail } = usePlatform();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  const handleAdd = useCallback(() => {
    addEmail(email, name);
    setEmail('');
    setName('');
  }, [email, name, addEmail]);

  const exportCsv = useCallback(() => {
    const header = 'name,email,addedAt\n';
    const rows = emailContacts
      .map((c) => `"${(c.name || '').replace(/"/g, '""')}","${(c.email || '').replace(/"/g, '""')}","${c.addedAt}"`)
      .join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platform_email_list_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [emailContacts]);

  return (
    <section className="border-t border-border/50 py-16 md:py-20">
      <div className="mx-auto max-w-4xl px-4 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-primary">Email</p>
            <h2 className="text-2xl font-bold text-foreground">メールマーケティング</h2>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={emailContacts.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/20 text-primary text-xs font-bold uppercase hover:bg-primary/30 transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            <DownloadIcon />
            CSVエクスポート
          </button>
        </div>
        <p className="text-sm text-muted-foreground">リリース告知用のメールリストを管理し、CSVでエクスポートできます。</p>

        <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px] space-y-1">
              <label className="text-xs text-muted-foreground uppercase">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="example@email.com"
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground"
              />
            </div>
            <div className="w-40 space-y-1">
              <label className="text-xs text-muted-foreground uppercase">名前（任意）</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="名前"
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted-foreground"
              />
            </div>
            <button
              type="button"
              onClick={handleAdd}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase hover:brightness-110 transition-colors"
            >
              追加
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2 text-muted-foreground">
            <MailIcon />
            <span className="text-xs font-bold uppercase">登録一覧（{emailContacts.length}件）</span>
          </div>
          <ul className="divide-y divide-border/50">
            {emailContacts.length === 0 && (
              <li className="p-8 text-center text-muted-foreground text-sm">まだアドレスがありません。</li>
            )}
            {emailContacts.map((c) => (
              <li key={c.id} className="flex items-center gap-4 p-4 hover:bg-card/80">
                <span className="flex-1 font-mono text-sm text-foreground">{c.email}</span>
                <span className="text-sm text-muted-foreground">{c.name || '—'}</span>
                <button
                  type="button"
                  onClick={() => removeEmail(c.id)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="削除"
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
