import { redirect } from 'next/navigation'
import { getUser } from '@/lib/dal'
import { LogoutButton } from '@/components/auth/logout-button'

/**
 * Authenticated layout -- wraps all authenticated pages (candidate, employer).
 * Calls the DAL to verify session. If no valid user, redirects to /login.
 *
 * Renders a dark header bar with app wordmark, user info, and logout.
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
      <header className="bg-sidebar">
        <div className="flex h-14 items-center justify-between px-6">
          <span className="font-sans text-sm font-semibold text-white">
            Cromwell Chase
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-sidebar-foreground/60">
              {user.email}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-medium text-white">
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
