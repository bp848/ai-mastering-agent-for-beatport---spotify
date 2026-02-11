-- 購入済みマスターを7日間再ダウンロード可能にする: 履歴に保存先と有効期限を追加
-- 前提: 001_download_history.sql で download_history が作成済みであること

alter table public.download_history
  add column if not exists storage_path text,
  add column if not exists expires_at timestamptz;

comment on column public.download_history.storage_path is 'Supabase Storage path (bucket mastered). Null = 保存なし（旧レコード）.';
comment on column public.download_history.expires_at is '再ダウンロード有効期限（購入日+7日等）. Null = 再DL不可.';

-- マスター音源用バケット（非公開）。Dashboard で作成している場合は手動でポリシーのみ追加
-- バケット作成: Dashboard > Storage > New bucket > id: mastered, Public: OFF
-- または以下で作成（既存ならエラーになるので Dashboard 推奨）:
-- insert into storage.buckets (id, name, public) values ('mastered', 'mastered', false);

-- 認証ユーザーが自分のフォルダ（user_id/xxx.wav）にのみアップロード可能
create policy "Users can upload to own folder in mastered"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'mastered'
  and (storage.foldername(name))[1] = auth.uid()::text
);
