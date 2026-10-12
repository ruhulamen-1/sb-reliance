import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

// API port is written by the server on start (server/.api-port); default 3000
function apiTarget() {
  try {
    const p = readFileSync(new URL('../server/.api-port', import.meta.url), 'utf8').trim();
    return `http://localhost:${Number(p) || 3000}`;
  } catch {
    return 'http://localhost:3000';
  }
}

// Vite itself already moves to the next free port if 5173 is busy
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': apiTarget(), '/uploads': apiTarget() } },
});
