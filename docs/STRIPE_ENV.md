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

---

## Stripe Webhook 代替：新規ログイン時に管理者へメール

Webhook が使えない間、**Googleログイン・会員登録のたびにあなた（管理者）へメール1通**送る代替を入れています。

- **API**: `POST /api/notify-new-signup`（ログイン後にクライアントが Bearer 付きで呼ぶ。同一ユーザーは1回だけ送信）
- **マイグレーション**: `004_notified_signups.sql` を適用し、`notified_signups` テーブルを作成

### Vercel 環境変数（メール送信したい場合）

| 変数 | 説明 |
|------|------|
| **NOTIFY_EMAIL** または **ADMIN_EMAIL** | 通知先メールアドレス（あなたのアドレス） |
| **RESEND_API_KEY** | [Resend](https://resend.com) の API キー（Dashboard → API Keys） |
| **NOTIFY_FROM** | 送信元アドレス（省略時は `onboarding@resend.dev`。独自ドメインなら Resend で検証後に指定） |

`NOTIFY_EMAIL` か `RESEND_API_KEY` が未設定の場合はメールは送らず、DB には「通知済み」だけ記録されます。
