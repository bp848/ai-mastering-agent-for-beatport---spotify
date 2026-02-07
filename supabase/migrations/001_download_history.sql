-- ダウンロード・購入履歴テーブル（Googleログイン必須のダウンロード時に1件追加）
create table if not exists public.download_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  mastering_target text not null check (mastering_target in ('beatport', 'spotify')),
  amount_cents integer,
  created_at timestamptz not null default now()
);

-- RLS: 自分の行のみ読める・挿入できる
alter table public.download_history enable row level security;

create policy "Users can read own download_history"
  on public.download_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own download_history"
  on public.download_history for insert
  with check (auth.uid() = user_id);

-- インデックス（履歴一覧の取得用）
create index if not exists download_history_user_id_created_at_idx
  on public.download_history (user_id, created_at desc);
