import './loadEnv'
import { Pool, type QueryResultRow } from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('Missing DATABASE_URL')
}

export const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
})

export async function query<T extends QueryResultRow = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
) {
  return pool.query<T>(text, params)
}
