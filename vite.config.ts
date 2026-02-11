import path from 'path';
import { createRequire } from 'node:module';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const _require = createRequire(import.meta.url);
const pkg = _require('./package.json');

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY ?? ''),
        // 互換: Vercel 側で VITE_OPENAI_API という名前で入っていても動くようにする
        'import.meta.env.VITE_OPENAI_API_KEY': JSON.stringify(env.VITE_OPENAI_API_KEY ?? env.VITE_OPENAI_API ?? ''),
        'import.meta.env.VITE_OPENAI_MASTERING_MODEL': JSON.stringify(env.VITE_OPENAI_MASTERING_MODEL ?? 'gpt-4o'),
        __APP_VERSION__: JSON.stringify(pkg.version ?? '0.0.0'),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
