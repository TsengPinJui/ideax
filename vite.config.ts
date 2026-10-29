import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
      'process.env.DIFY_API_BASE_URL': JSON.stringify(env.DIFY_API_BASE_URL || ''),
      'process.env.DIFY_AICRM_API_KEY': JSON.stringify(env.DIFY_AICRM_API_KEY || ''),
      'process.env.DIFY_CS_API_KEY': JSON.stringify(env.DIFY_CS_API_KEY || ''),
      'process.env.DIFY_MARKET_ADVISOR_API_KEY': JSON.stringify(env.DIFY_MARKET_ADVISOR_API_KEY || ''),
      'process.env.DIFY_EXPLORER_API_KEY': JSON.stringify(env.DIFY_EXPLORER_API_KEY || ''),
      'process.env.DIFY_AICRM_WEB_URL': JSON.stringify(env.DIFY_AICRM_WEB_URL || ''),
      'process.env.DIFY_EXPLORER_WEB_URL': JSON.stringify(env.DIFY_EXPLORER_WEB_URL || ''),
      'process.env.ADMIN_EMAILS': JSON.stringify(env.ADMIN_EMAILS || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
