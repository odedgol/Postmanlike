import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Vite 5 (used internally by Vitest 2) and Vite 6 (our dev server) ship
  // incompatible Plugin types; runtime is identical, so cast to unblock tsc.
  plugins: [react() as unknown as never],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    globals: true,
  },
});
