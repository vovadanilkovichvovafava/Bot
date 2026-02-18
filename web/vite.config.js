import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

// Plugin: inject build version into sw.js on build
function swVersionPlugin() {
  return {
    name: 'sw-version',
    writeBundle() {
      const swPath = resolve('dist', 'sw.js');
      try {
        let content = readFileSync(swPath, 'utf-8');
        const version = Date.now().toString(36); // short unique version
        content = content.replace(/__SW_VERSION__/g, version);
        writeFileSync(swPath, content);
        console.log(`[sw-version] Injected SW version: ${version}`);
      } catch (e) {
        console.warn('[sw-version] Could not inject version:', e.message);
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), swVersionPlugin()],
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Keep old hashed assets so Yandex Metrica Webvisor can replay old sessions
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  }
})
