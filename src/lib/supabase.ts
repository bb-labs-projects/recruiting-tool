import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient

export function getSupabase() {
  _supabase ??= createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  return _supabase
}

export const CV_BUCKET = 'cvs'
export const JOB_ADS_BUCKET = 'job-ads'
