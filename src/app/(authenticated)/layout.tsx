import { redirect } from 'next/navigation'
import { getUser } from '@/lib/dal'
import { LogoutButton } from '@/components/auth/logout-button'
import { HeaderNav } from '@/components/auth/header-nav'

/**
 * Authenticated layout -- wraps all authenticated pages (candidate, employer).
 * Calls the DAL to verify session. If no valid user, redirects to /login.
 *
 * Renders a dark header bar with app wordmark, centered nav, user info, and logout.
 */
export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  const initials = user.email
    ? user.email
        .split('@')[0]
        .split(/[._-]/)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase() ?? '')
        .join('')
    : '?'

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="w-full bg-[oklch(0.12_0.01_260)] sticky top-0 z-50">
        <div className="flex h-14 items-center px-6 max-w-7xl mx-auto gap-12">
          <span className="font-sans text-[16px] font-semibold tracking-tight text-white">
            Cromwell Chase
          </span>
          <HeaderNav role={user.role} />
          <div className="flex items-center gap-3">
            <span className="text-xs text-[oklch(0.60_0_0)]">
              {user.email}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[oklch(0.16_0.01_260)] text-xs font-medium text-white">
              {initials}
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
