import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        // Use IPv4 loopback to avoid ECONNRESET on some Windows/Node setups.
        target: 'http://127.0.0.1:8083',
        changeOrigin: true,
      },
    },
  },
})
