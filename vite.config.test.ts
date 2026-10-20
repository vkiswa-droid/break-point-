import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      electron: path.resolve(__dirname, 'tests/mocks/electronMock.cjs')
    }
  },
  build: {
    outDir: 'dist-tests',
    emptyOutDir: true,
    lib: {
      entry: 'tests/runSuite.cjs',
      formats: ['cjs'],
      fileName: () => 'suite.cjs'
    },
    rollupOptions: {
      external: ['node:test', 'node:assert', 'sherpa-onnx-node', 'fs', 'path', 'os', 'child_process']
    }
  }
});
