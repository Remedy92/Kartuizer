type BuildAppUrlOptions = {
  path?: string
  hash?: string
  search?: Record<string, string | null | undefined>
}

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

export function buildAppUrl(appUrl: string | null | undefined, options: BuildAppUrlOptions = {}): string | null {
  const raw = (appUrl ?? '').trim()
  if (!raw) return null

  const withProtocol = hasProtocol(raw) ? raw : `https://${raw}`

  let url: URL
  try {
    url = new URL(withProtocol)
  } catch {
    return null
  }

  // APP_URL should be the app root. If it's accidentally set to a specific route, strip it.
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
