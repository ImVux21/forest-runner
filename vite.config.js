import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // Make assets served from /public accessible
  publicDir: 'public',
  build: {
    outDir: 'dist',
    // Target <15MB — GLTF files are already small (KayKit uses shared texture atlas)
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('three')) {
            return 'three';
          }
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
