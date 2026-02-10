# Stripe 決済まわりの環境変数（Vercel）

## すでに設定済み（あなたの記載）

- **STRIPE_PUBLIC** … フロント用（現状は Checkout リダイレクトのため未使用。将来 Stripe.js 用に使う場合は `VITE_STRIPE_PUBLISHABLE_KEY` にも同じ値を入れるとよいです）
- **STRIPE_SECRET** … API 用。`/api/create-checkout-session` と `/api/webhook-stripe` で使用

## 追加で設定するもの

1. **STRIPE_WEBHOOK_SECRET**  
   Stripe ダッシュボード → Developers → Webhooks → エンドポイント追加  
   - URL: `https://あなたのドメイン/api/webhook-stripe`  
   - イベント: `checkout.session.completed`  
   作成後に「Signing secret」をコピーして Vercel の環境変数に設定。

2. **SUPABASE_SERVICE_ROLE_KEY**（または **SUPABASE_SERVICE_KEY**）  
   Supabase ダッシュボード → Settings → API → `service_role`（secret）をコピーして Vercel の環境変数に設定。  
   Webhook が `download_tokens` に `paid=true` で 1 件挿入するために必要です。

## 参照している変数名の対応

- **API（create-checkout-session）**: `STRIPE_SECRET` または `STRIPE_SECRET_KEY`
- **API（webhook-stripe）**: `STRIPE_SECRET` / `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`SUPABASE_SERVICE_ROLE_KEY`、`VITE_SUPABASE_URL` または `SUPABASE_URL`
