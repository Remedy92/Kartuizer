import { build } from 'esbuild'

await build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'api/_compiled.mjs',
  banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" },
  external: [],
})

console.log('API serverless function bundled to api/_compiled.mjs')
