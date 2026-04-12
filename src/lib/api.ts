/** Base URL for API calls (production: external Express host). */
export function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`
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
