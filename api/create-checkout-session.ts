import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const stripeSecret = process.env.STRIPE_SECRET || process.env.STRIPE_SECRET_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', code: 'missing_token' });
  }

  if (!stripeSecret.startsWith('sk_')) {
    return res.status(500).json({ error: 'Stripe not configured', code: 'stripe_missing' });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user?.id) {
    return res.status(401).json({ error: 'Invalid or expired token', code: 'auth_failed' });
  }

  const body = req.body as { amountCents?: number; planName?: string; tokenCount?: number };
  const amountCents = Number(body?.amountCents);
  const planName = typeof body?.planName === 'string' ? body.planName : 'Download pack';
  const tokenCount = Math.max(1, Math.min(1000, Math.floor(Number(body?.tokenCount) || 1)));
  if (!Number.isInteger(amountCents) || amountCents < 100) {
    return res.status(400).json({ error: 'Invalid amountCents (min 100)', code: 'bad_request' });
  }

  const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || 'https://' + (req.headers.host || '');
  const stripe = new Stripe(stripeSecret);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'jpy',
            unit_amount: amountCents,
            product_data: {
              name: planName,
              description: 'AI Mastering Agent — WAV download entitlement',
            },
          },
        },
      ],
      client_reference_id: user.id,
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
      metadata: {
        user_id: user.id,
        amount_cents: String(amountCents),
        token_count: String(tokenCount),
      },
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: err?.message || 'Checkout failed', code: 'stripe_error' });
  }
}
