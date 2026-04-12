import { build } from 'vite'
import path from 'path'
import { rename, rm, mkdir } from 'fs/promises'

const tmpDir = '.api-build-tmp'

await build({
  configFile: false,
  build: {
    ssr: 'server/index.ts',
    outDir: tmpDir,
    rollupOptions: {
      output: {
        entryFileNames: '_compiled.mjs',
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

await mkdir('api', { recursive: true })
await rename(path.join(tmpDir, '_compiled.mjs'), 'api/_compiled.mjs')
await rm(tmpDir, { recursive: true, force: true })

console.log('API serverless function bundled to api/_compiled.mjs')
