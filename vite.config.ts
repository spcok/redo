import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // --------------------------------------------------------
      // THE FIX: AI Studio Proxy Bypass for ElectricSQL & Zrok
      // --------------------------------------------------------
      host: '0.0.0.0', // Ensures compatibility with external proxies
      proxy: {
        // Intercept any sync requests and silently forward them to your Zrok tunnel
        '/v1/shape': {
          target: 'https://ubwr6xgwohim.share.zrok.io',
          changeOrigin: true,
          secure: false,
        }
      },
      // --------------------------------------------------------
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});