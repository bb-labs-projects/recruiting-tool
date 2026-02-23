import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { getSupabase, CV_BUCKET } from '@/lib/supabase'

/**
 * GET /api/health — diagnostic endpoint to check DB and Supabase connectivity.
 */
export async function GET() {
  const checks: Record<string, string> = {}

  // Check database
  try {
    await db.execute(sql`SELECT 1`)
    checks.database = 'ok'
  } catch (error) {
    checks.database = `error: ${error instanceof Error ? error.message : String(error)}`
  }

  // Check Supabase storage
  try {
    const supabase = getSupabase()
    const { error } = await supabase.storage.from(CV_BUCKET).list('', { limit: 1 })
    checks.supabase_storage = error ? `error: ${error.message}` : 'ok'
  } catch (error) {
    checks.supabase_storage = `error: ${error instanceof Error ? error.message : String(error)}`
  }

  // Check env vars (existence only, not values)
  checks.env_DATABASE_URL = process.env.DATABASE_URL ? 'set' : 'MISSING'
  checks.env_SESSION_SECRET = process.env.SESSION_SECRET ? 'set' : 'MISSING'
  checks.env_RESEND_API_KEY = process.env.RESEND_API_KEY ? 'set' : 'MISSING'
  checks.env_APP_URL = process.env.APP_URL ?? 'NOT SET (defaults to localhost)'
  checks.env_SUPABASE_URL = process.env.SUPABASE_URL ? 'set' : 'MISSING'
  checks.env_SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING'

  const allOk = checks.database === 'ok' && checks.supabase_storage === 'ok'

  return NextResponse.json(checks, { status: allOk ? 200 : 500 })
}
