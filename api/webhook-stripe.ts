import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

/** Vercel: raw body を取得するため bodyParser 無効化。Vercel の Node ランタイムでは req は IncomingMessage。 */
export const config = { api: { bodyParser: false as const } };

const stripeSecret = process.env.STRIPE_SECRET || process.env.STRIPE_SECRET_KEY || '';
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  '';

function getRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    (req as unknown as { on: (e: string, cb: (c: Buffer) => void) => void }).on?.('data', (chunk: Buffer) => chunks.push(chunk));
    (req as unknown as { on: (e: string, cb: () => void) => void }).on?.('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    (req as unknown as { on: (e: string, cb: (e: Error) => void) => void }).on?.('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!webhookSecret || !stripeSecret.startsWith('sk_')) {
    return res.status(500).json({ error: 'Stripe or webhook secret not configured' });
  }

  const rawBody = await getRawBody(req);
  const sig = (req.headers['stripe-signature'] as string) || '';
  const stripe = new Stripe(stripeSecret);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error('Webhook signature verification failed:', err?.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  if (event.type !== 'checkout.session.completed') {
    return res.status(200).json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const userId = session.client_reference_id || session.metadata?.user_id;
  const amountCents = session.metadata?.amount_cents ? parseInt(session.metadata.amount_cents, 10) : (session.amount_total ?? 0);

  if (!userId || !supabaseServiceKey) {
    console.error('Webhook: missing user_id or SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ error: 'Configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
  const { error } = await supabase.from('download_tokens').insert({
    user_id: userId,
    file_path: 'pack',
    file_name: 'pack',
    mastering_target: 'beatport',
    amount_cents: amountCents,
    paid: true,
  });

  if (error) {
    console.error('Webhook: insert download_tokens failed', error);
    return res.status(500).json({ error: 'Database error' });
  }

  return res.status(200).json({ received: true });
}
