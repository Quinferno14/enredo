import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Gera um único HTML com tudo embutido, que abre offline com dois cliques.
export default defineConfig({
  plugins: [preact(), viteSingleFile()],
  build: { outDir: 'dist', emptyOutDir: true },
});
