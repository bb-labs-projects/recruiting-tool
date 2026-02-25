import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/dal'
import { LogoutButton } from '@/components/auth/logout-button'

/**
 * Authenticated layout -- wraps all authenticated pages (candidate, employer).
 * Calls the DAL to verify session. If no valid user, redirects to /login.
 *
 * Renders a basic app shell with header and content area.
 * The header shows the app name, user email, and logout button.
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border/60 bg-card card-warm">
        <div className="flex h-14 items-center justify-between px-6">
          <span className="font-[family-name:var(--font-outfit)] text-lg font-bold tracking-tight text-foreground">
            IP Lawyer Recruiting
          </span>
          <div className="flex items-center gap-4">
            <Link
              href="/settings/mfa"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Security
            </Link>
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
