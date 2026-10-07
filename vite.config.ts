import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: {
      'process.env.DIFY_API_BASE_URL': JSON.stringify(process.env.DIFY_API_BASE_URL || 'https://api.dify.ai/v1'),
      'process.env.DIFY_AICRM_API_KEY': JSON.stringify(process.env.DIFY_AICRM_API_KEY || 'app-WnL0BqYzHviViu4Oogmbj85j'),
      'process.env.DIFY_CS_API_KEY': JSON.stringify(process.env.DIFY_CS_API_KEY || 'app-VQ8gZUbV7tVlW1x916o1oeI6'),
      'process.env.DIFY_MARKET_ADVISOR_API_KEY': JSON.stringify(process.env.DIFY_MARKET_ADVISOR_API_KEY || 'app-Hwi0hh3nGTIMpAMybQiKSNoO'),
      'process.env.DIFY_AICRM_WEB_URL': JSON.stringify(process.env.DIFY_AICRM_WEB_URL || 'https://udify.app/agent/BnAiF81AGw454x0u'),
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
