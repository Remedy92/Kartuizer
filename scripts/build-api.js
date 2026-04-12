import { build } from 'vite'
import path from 'path'

await build({
  configFile: false,
  build: {
    ssr: 'server/index.ts',
    outDir: 'api',
    rollupOptions: {
      output: { entryFileNames: '_compiled.mjs' },
    },
    target: 'node20',
    minify: false,
  },
  ssr: {
    // Bundle all dependencies into the output (required for Vercel serverless)
    noExternal: true,
  },
  resolve: {
    alias: { '@': path.resolve(process.cwd(), 'src') },
  },
})

console.log('API serverless function bundled to api/_compiled.mjs')
