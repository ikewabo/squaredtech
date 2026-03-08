import { defineConfig } from 'vite';

export default defineConfig({
    // Base public path when served in production.
    base: './',
    build: {
        outDir: 'dist',
        emptyOutDir: true
    }
});
