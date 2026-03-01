import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getUser } from '@/lib/dal'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import {
  LINKEDIN_TOKEN_URL,
  LINKEDIN_USERINFO_URL,
  getRedirectUri,
} from '@/lib/linkedin/config'

const appUrl = process.env.APP_URL ?? 'http://localhost:3000'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // LinkedIn returned an error (user denied, etc.)
  if (error) {
    return NextResponse.redirect(new URL('/candidate?linkedin=error', appUrl))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/candidate?linkedin=error', appUrl))
  }

  // Verify state
  const cookieStore = await cookies()
  const savedState = cookieStore.get('linkedin_state')?.value
  cookieStore.delete('linkedin_state')

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(new URL('/candidate?linkedin=error', appUrl))
  }

  // Auth check
  const user = await getUser()
  if (!user || user.role !== 'candidate') {
    return NextResponse.redirect(new URL('/login', appUrl))
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch(LINKEDIN_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: getRedirectUri(),
        client_id: process.env.LINKEDIN_CLIENT_ID ?? '',
        client_secret: process.env.LINKEDIN_CLIENT_SECRET ?? '',
      }),
    })

    if (!tokenRes.ok) {
      console.error('LinkedIn token exchange failed:', await tokenRes.text())
      return NextResponse.redirect(new URL('/candidate?linkedin=error', appUrl))
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token as string

    // Fetch userinfo
    const userinfoRes = await fetch(LINKEDIN_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!userinfoRes.ok) {
      console.error('LinkedIn userinfo failed:', await userinfoRes.text())
      return NextResponse.redirect(new URL('/candidate?linkedin=error', appUrl))
    }

    const userinfo = await userinfoRes.json()

    // Look up candidate profile
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, user.id),
    })

    if (!profile) {
      return NextResponse.redirect(new URL('/candidate?linkedin=error', appUrl))
    }

    // Update profile with LinkedIn data
    await db
      .update(profiles)
      .set({
        linkedinSub: userinfo.sub as string,
        linkedinName: (userinfo.name as string) ?? null,
        linkedinEmail: (userinfo.email as string) ?? null,
        linkedinEmailVerified: (userinfo.email_verified as boolean) ?? false,
        linkedinPictureUrl: (userinfo.picture as string) ?? null,
        linkedinConnectedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, profile.id))

    return NextResponse.redirect(new URL('/candidate?linkedin=connected', appUrl))
  } catch (err) {
    console.error('LinkedIn callback error:', err)
    return NextResponse.redirect(new URL('/candidate?linkedin=error', appUrl))
  }
}
