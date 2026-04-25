/** Base URL for API calls. Production uses a split deploy, so VITE_API_BASE_URL must
 *  point at the long-lived API host. Development falls back to the local API port. */
export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const configuredBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')
  if (configuredBase) return `${configuredBase}${normalized}`
  if (import.meta.env.PROD) return normalized
  const base = 'http://localhost:8787'
  return `${base}${normalized}`
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({} as { error?: string }))
    throw new Error(payload.error || 'Er is een fout opgetreden')
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
