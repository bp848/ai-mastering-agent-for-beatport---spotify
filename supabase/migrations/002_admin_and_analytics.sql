-- 管理者メール（この一覧に含まれるユーザーのみ Admin にアクセス可能）
create table if not exists public.admin_emails (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.admin_emails enable row level security;

create policy "Only existing admins can read admin_emails"
  on public.admin_emails for select
  using (
    exists (
      select 1 from public.admin_emails ae
      where ae.email = (select email from auth.users where id = auth.uid())
    )
  );

-- サービスロールで insert/update/delete（Dashboard または Edge Function から運用）
-- フロントからは「自分が admin か」の判定用に select のみ

-- 設定（Gemini / Stripe キー等）。本番では Vault 利用を推奨
create table if not exists public.admin_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.admin_settings enable row level security;

-- Admin のみ読める・書ける（設定画面からキーを保存）
create policy "Admins can read admin_settings"
  on public.admin_settings for select
  using (
    exists (
      select 1 from public.admin_emails ae
      where ae.email = (select email from auth.users where id = auth.uid())
    )
  );

create policy "Admins can insert admin_settings"
  on public.admin_settings for insert
  with check (
    exists (
      select 1 from public.admin_emails ae
      where ae.email = (select email from auth.users where id = auth.uid())
    )
  );

create policy "Admins can update admin_settings"
  on public.admin_settings for update
  using (
    exists (
      select 1 from public.admin_emails ae
      where ae.email = (select email from auth.users where id = auth.uid())
    )
  );

-- オリジナルアナリティクス用イベント
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  user_id uuid references auth.users(id) on delete set null,
  properties jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_event_name_idx on public.analytics_events (event_name);

alter table public.analytics_events enable row level security;

-- 挿入は認証ユーザーまたは匿名（user_id null）で許可。読取は Admin のみ
create policy "Authenticated or anon can insert analytics_events"
  on public.analytics_events for insert
  with check (true);

create policy "Admins can read analytics_events"
  on public.analytics_events for select
  using (
    exists (
      select 1 from public.admin_emails ae
      where ae.email = (select email from auth.users where id = auth.uid())
    )
  );

-- アップロード記録（アップ曲）
create table if not exists public.upload_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  file_name text,
  file_size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists upload_events_user_created_idx on public.upload_events (user_id, created_at desc);

alter table public.upload_events enable row level security;

create policy "Anyone can insert upload_events"
  on public.upload_events for insert
  with check (true);

create policy "Admins can read upload_events"
  on public.upload_events for select
  using (
    exists (
      select 1 from public.admin_emails ae
      where ae.email = (select email from auth.users where id = auth.uid())
    )
  );

-- 決済履歴（Stripe 連携用）
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_payment_intent_id text,
  amount_cents integer not null,
  currency text not null default 'jpy',
  status text not null,
  download_history_id uuid references public.download_history(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists payments_user_created_idx on public.payments (user_id, created_at desc);

alter table public.payments enable row level security;

create policy "Users can read own payments"
  on public.payments for select
  using (auth.uid() = user_id);

create policy "Admins can read all payments"
  on public.payments for select
  using (
    exists (
      select 1 from public.admin_emails ae
      where ae.email = (select email from auth.users where id = auth.uid())
    )
  );

-- 広告費入力（手動 or 連携用）
create table if not exists public.ad_spend (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  campaign_name text,
  spend_cents integer not null,
  date date not null,
  created_at timestamptz not null default now()
);

alter table public.ad_spend enable row level security;

create policy "Admins can manage ad_spend"
  on public.ad_spend for all
  using (
    exists (
      select 1 from public.admin_emails ae
      where ae.email = (select email from auth.users where id = auth.uid())
    )
  );
