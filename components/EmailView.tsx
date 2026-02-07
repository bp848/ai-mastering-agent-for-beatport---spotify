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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">メールマーケティング</h2>
        <button
          type="button"
          onClick={exportCsv}
          disabled={emailContacts.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase hover:bg-emerald-500/30 transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          <DownloadIcon />
          CSVエクスポート
        </button>
      </div>
      <p className="text-sm text-gray-500">リリース告知用のメールリストを管理し、CSVでエクスポートできます。</p>

      <div className="bg-[#141414] rounded-2xl border border-white/10 p-6 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-[10px] text-gray-500 uppercase">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="example@email.com"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600"
            />
          </div>
          <div className="w-40 space-y-1">
            <label className="text-[10px] text-gray-500 uppercase">名前（任意）</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="名前"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold uppercase hover:bg-emerald-600 transition-colors"
          >
            追加
          </button>
        </div>
      </div>

      <div className="bg-[#141414] rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center gap-2 text-gray-500">
          <MailIcon />
          <span className="text-[10px] font-bold uppercase">登録一覧（{emailContacts.length}件）</span>
        </div>
        <ul className="divide-y divide-white/5">
          {emailContacts.length === 0 && (
            <li className="p-8 text-center text-gray-500 text-sm">まだアドレスがありません。</li>
          )}
          {emailContacts.map((c) => (
            <li key={c.id} className="flex items-center gap-4 p-4 hover:bg-white/[0.02]">
              <span className="flex-1 font-mono text-sm text-white">{c.email}</span>
              <span className="text-sm text-gray-500">{c.name || '—'}</span>
              <button
                type="button"
                onClick={() => removeEmail(c.id)}
                className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="削除"
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
