/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public base URL of the Express API (no trailing slash). Empty = same-origin / dev proxy. */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
