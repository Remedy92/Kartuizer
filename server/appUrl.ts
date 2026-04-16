type BuildAppUrlOptions = {
  path?: string
  hash?: string
  search?: Record<string, string | null | undefined>
}

const DEFAULT_PUBLIC_APP_ORIGIN = 'https://karthuizer.vercel.app'

const APP_ROUTE_PREFIXES = [
  '/dashboard',
  '/login',
  '/reset-password',
  '/archive',
  '/admin',
  '/pending-approval',
  '/questions',
  '/groepen',
]

function hasProtocol(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

function normalizeOrigin(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim()
  if (!raw) return null

  const withProtocol = hasProtocol(raw) ? raw : `https://${raw}`

  try {
    const url = new URL(withProtocol)
    return url.origin
  } catch {
    return null
  }
}

function isLocalOrigin(value: string | null | undefined): boolean {
  const origin = normalizeOrigin(value)
  if (!origin) return false

  try {
    const { hostname } = new URL(origin)
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  } catch {
    return false
  }
}

function stripAccidentalRoutePath(pathname: string): string | null {
  for (const prefix of APP_ROUTE_PREFIXES) {
    const route = prefix.replace(/^\//, '')
    const needle = `/${route}`
    const idx = pathname.indexOf(needle)
    if (idx === -1) continue

    const after = pathname[idx + needle.length]
    if (after && after !== '/') continue

    const base = pathname.slice(0, idx)
    if (!base) return '/'
    return base.endsWith('/') ? base : `${base}/`
  }

  return null
}

function joinPath(basePathname: string, path: string): string {
  const base = basePathname.endsWith('/') ? basePathname : `${basePathname}/`
  const cleanBase = base === '//' ? '/' : base
  const cleanPath = path.replace(/^\/+/, '')
  return cleanPath ? `${cleanBase}${cleanPath}` : cleanBase
}

export function buildAppUrl(
  appUrl: string | null | undefined,
  options: BuildAppUrlOptions = {}
): string | null {
  const raw = (appUrl ?? '').trim()
  if (!raw) return null

  const withProtocol = hasProtocol(raw) ? raw : `https://${raw}`

  let url: URL
  try {
    url = new URL(withProtocol)
  } catch {
    return null
  }

  const strippedPath = stripAccidentalRoutePath(url.pathname)
  if (strippedPath) url.pathname = strippedPath

  if (url.hash) {
    const trimmed = url.hash.replace(/^#/, '')
    const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
    const strippedHashPath = stripAccidentalRoutePath(normalized)
    if (strippedHashPath) url.hash = ''
  }

  url.search = ''
  url.hash = ''

  if (options.path) {
    url.pathname = joinPath(url.pathname, options.path)
  }

  if (options.search) {
    for (const [key, value] of Object.entries(options.search)) {
      if (value === null || value === undefined || value === '') continue
      url.searchParams.set(key, value)
    }
  }

  if (options.hash) {
    const clean = options.hash.replace(/^#/, '')
    url.hash = clean ? `#${clean}` : ''
  }

  return url.toString()
}

export function resolvePublicAppOrigin(): string {
  const allowLocalAppUrls =
    process.env.ALLOW_LOCAL_APP_URLS_IN_EMAIL === '1' ||
    process.env.ALLOW_LOCAL_APP_URLS_IN_EMAIL === 'true'

  const explicitPublicOrigin = normalizeOrigin(
    process.env.PUBLIC_APP_ORIGIN ?? process.env.PUBLIC_WEB_ORIGIN
  )
  if (explicitPublicOrigin) return explicitPublicOrigin

  const appOrigin = normalizeOrigin(process.env.APP_ORIGIN)
  if (appOrigin && (!isLocalOrigin(appOrigin) || allowLocalAppUrls)) return appOrigin

  const vercelProductionOrigin = normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL)
  if (vercelProductionOrigin) return vercelProductionOrigin

  const vercelBranchOrigin = normalizeOrigin(process.env.VERCEL_BRANCH_URL)
  if (vercelBranchOrigin) return vercelBranchOrigin

  const vercelPreviewOrigin = normalizeOrigin(process.env.VERCEL_URL)
  if (vercelPreviewOrigin) return vercelPreviewOrigin

  return DEFAULT_PUBLIC_APP_ORIGIN
}
