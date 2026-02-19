import { redirect } from 'next/navigation'
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
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="flex h-14 items-center justify-between px-6">
          <span className="text-lg font-semibold">IP Lawyer Recruiting</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
