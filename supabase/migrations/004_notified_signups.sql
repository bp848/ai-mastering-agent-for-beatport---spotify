-- 新規ログイン・会員登録時に管理者へメール通知したユーザーを記録（1通だけ送るため）
create table if not exists public.notified_signups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.notified_signups is 'Notify-new-signup API でメール送信済みの user_id。重複送信防止用。';

alter table public.notified_signups enable row level security;

-- このテーブルは API（service role）のみ操作。フロントからは触らない
create policy "Service role only (no direct client access)"
  on public.notified_signups for all
  using (false)
  with check (false);
マスタリングすると音が悪くなる、ずっとレッドメーター張り付き状態、これじゃよくなるわけがない