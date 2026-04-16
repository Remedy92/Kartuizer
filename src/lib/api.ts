/** Base URL for API calls. In production the API is co-located on Vercel, so we always
 *  use a relative path. In development the Express server runs on a separate port, so we
 *  fall back to VITE_API_BASE_URL (default: http://localhost:8787). */
export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (import.meta.env.PROD) return normalized
  const base = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787').replace(/\/$/, '')
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
