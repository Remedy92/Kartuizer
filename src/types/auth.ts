export interface AppSession {
  user: {
    id: string
    email: string
    name?: string | null
  }
  session: {
    id: string
    expiresAt?: string
  }
}
