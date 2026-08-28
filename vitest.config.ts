import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    // Testes de domínio (cálculo puro) — sem DOM, roda rápido. Testes de
    // componente virão depois com environment 'jsdom' num projeto separado.
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    globals: false,
  },
});
