import React, { useState } from 'react';
import AdminSettings from './AdminSettings';
import AdminUsers from './AdminUsers';
import AdminUploads from './AdminUploads';
import AdminDownloads from './AdminDownloads';
import AdminPayments from './AdminPayments';
import AdminAnalytics from './AdminAnalytics';
import AdminAdROI from './AdminAdROI';
import AdminFunnel from './AdminFunnel';
import AdminAIAds from './AdminAIAds';

export type AdminTab =
  | 'settings'
  | 'users'
  | 'uploads'
  | 'downloads'
  | 'payments'
  | 'analytics'
  | 'adroi'
  | 'funnel'
  | 'aiads';

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'settings', label: '設定（キー）' },
  { id: 'users', label: 'ユーザー一覧' },
  { id: 'uploads', label: 'アップ曲' },
  { id: 'downloads', label: 'DL曲' },
  { id: 'payments', label: '支払い履歴' },
  { id: 'analytics', label: 'アナリティクス' },
  { id: 'adroi', label: '広告 費用対効果' },
  { id: 'funnel', label: 'ファネル検証' },
  { id: 'aiads', label: 'AI 広告提案' },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>('settings');

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-0">
      <nav className="lg:w-48 shrink-0 flex flex-row lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-xl text-left text-xs font-bold uppercase whitespace-nowrap transition-colors ${
              tab === id
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-gray-500 border border-transparent hover:bg-white/5 hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
      <main className="flex-1 min-w-0 overflow-auto">
        {tab === 'settings' && <AdminSettings />}
        {tab === 'users' && <AdminUsers />}
        {tab === 'uploads' && <AdminUploads />}
        {tab === 'downloads' && <AdminDownloads />}
        {tab === 'payments' && <AdminPayments />}
        {tab === 'analytics' && <AdminAnalytics />}
        {tab === 'adroi' && <AdminAdROI />}
        {tab === 'funnel' && <AdminFunnel />}
        {tab === 'aiads' && <AdminAIAds />}
      </main>
    </div>
  );
}
