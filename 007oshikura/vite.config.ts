import { defineConfig } from 'vite';

// base: './' -> GitHub Pages などのサブパス配信でもそのまま動く
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets'
  }
});
