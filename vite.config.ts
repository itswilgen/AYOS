/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    // Customers are in the Philippines: time tests run in Manila time on every machine, CI included.
    env: { TZ: 'Asia/Manila' },
    restoreMocks: true,
  },
})
