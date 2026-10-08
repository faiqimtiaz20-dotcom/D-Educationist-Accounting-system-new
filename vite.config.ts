import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    // Allow ngrok / LAN hostnames (Vite 6+ blocks unknown Host headers)
    allowedHosts: ['.ngrok-free.dev', '.ngrok.io', '.ngrok.app', 'localhost'],
    // Single ngrok URL: SPA + /api proxied to Nest
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.ngrok-free.dev', '.ngrok.io', '.ngrok.app', 'localhost'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
})
