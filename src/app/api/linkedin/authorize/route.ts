import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import { getUser } from '@/lib/dal'
import { buildAuthorizeUrl } from '@/lib/linkedin/config'

export async function GET() {
  const user = await getUser()
  if (!user || user.role !== 'candidate') {
    return NextResponse.redirect(new URL('/login', process.env.APP_URL))
  }

  const state = randomBytes(32).toString('hex')

  const cookieStore = await cookies()
  cookieStore.set('linkedin_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10, // 10 minutes
  })

  return NextResponse.redirect(buildAuthorizeUrl(state))
}
