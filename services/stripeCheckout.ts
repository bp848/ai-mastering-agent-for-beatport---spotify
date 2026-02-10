/**
 * Stripe Checkout セッションを作成し、リダイレクト URL を返す。
 * フロントから /api/create-checkout-session を呼ぶ。
 */
export async function createCheckoutSession(
  accessToken: string,
  amountCents: number,
  planName: string
): Promise<{ url: string }> {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const res = await fetch(`${base}/api/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ amountCents, planName }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  if (!data?.url) {
    throw new Error('No checkout URL returned');
  }
  return { url: data.url };
}
