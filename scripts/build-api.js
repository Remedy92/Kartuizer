import { build } from 'vite'
import path from 'path'
import { rename, rm } from 'fs/promises'

const tmpDir = '.api-build-tmp'

await build({
  configFile: false,
  build: {
    ssr: 'server/index.ts',
    outDir: tmpDir,
    rollupOptions: {
      output: {
        entryFileNames: 'index.mjs',
        inlineDynamicImports: true,
      },
    },
    target: 'node20',
    minify: false,
    emptyOutDir: true,
  },
  ssr: {
    noExternal: true,
  },
  resolve: {
    alias: { '@': path.resolve(process.cwd(), 'src') },
  },
})

// Move the compiled file directly as api/index.mjs (the Vercel function entry)
await rename(path.join(tmpDir, 'index.mjs'), 'api/index.mjs')
await rm(tmpDir, { recursive: true, force: true })

console.log('API serverless function bundled to api/index.mjs')
