import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The SPA talks only to the C# API. Proxying keeps everything same-origin, so the
// HttpOnly auth cookie works without CORS.
const API_URL = 'http://localhost:5080'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': API_URL,
      '/signin-google': API_URL,
    },
  },
})
