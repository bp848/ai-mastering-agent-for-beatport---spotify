import { describe, it, expect, beforeAll } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

function createMockRes() {
  const out: { statusCode: number; body: unknown; headers: Record<string, string> } = {
    statusCode: 200,
    body: undefined,
    headers: {},
  };
  const res = {
    setHeader: (k: string, v: string) => {
      out.headers[k] = v;
    },
    status: (code: number) => {
      out.statusCode = code;
      return {
        json: (body: unknown) => {
          out.body = body;
          return res as unknown as VercelResponse;
        },
      };
    },
  } as unknown as VercelResponse;
  return { res, out };
}

describe('download api config guards', () => {
  beforeAll(() => {
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.VITE_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_ANON_KEY;
  });

  it('check-download-entitlement returns server_config when Supabase env is missing', async () => {
    const mod = await import('../api/check-download-entitlement');
    const handler = mod.default as (req: VercelRequest, res: VercelResponse) => Promise<unknown>;
    const { res, out } = createMockRes();
    const req = { method: 'GET', headers: {} } as unknown as VercelRequest;

    await handler(req, res);

    expect(out.statusCode).toBe(500);
    expect(out.body).toEqual({ allowed: false, code: 'server_config' });
  });

  it('consume-download-token returns server_config when Supabase env is missing', async () => {
    const mod = await import('../api/consume-download-token');
    const handler = mod.default as (req: VercelRequest, res: VercelResponse) => Promise<unknown>;
    const { res, out } = createMockRes();
    const req = { method: 'POST', headers: {} } as unknown as VercelRequest;

    await handler(req, res);

    expect(out.statusCode).toBe(500);
    expect(out.body).toEqual({ consumed: false, code: 'server_config' });
  });
});
