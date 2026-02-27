import { redirect } from 'next/navigation'
import { getUser } from '@/lib/dal'
import { LogoutButton } from '@/components/auth/logout-button'
import { SidebarNav } from '@/components/admin/sidebar-nav'

/**
 * Admin layout -- wraps all admin pages.
 * Verifies both authentication and admin role via the DAL.
 * If not authenticated or not admin, redirects to /login.
 *
 * Renders admin shell with dark sidebar navigation and main content area.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  if (!user || user.role !== 'admin') {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col bg-sidebar text-sidebar-foreground">
        <div className="px-5 py-4">
          <span className="font-sans text-sm font-semibold text-white">
            Cromwell Chase
          </span>
          <p className="font-mono text-[10px] uppercase tracking-widest text-sidebar-foreground/40">
            Admin
          </p>
        </div>

        <SidebarNav />

        <div className="border-t border-sidebar-border px-5 py-4">
          <p className="truncate text-xs text-sidebar-foreground/40">
            {user.email}
          </p>
          <div className="mt-2">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col bg-background">
        <header className="flex h-12 items-center border-b border-border px-6">
          <span className="text-xs text-muted-foreground">
            Signed in as {user.email}
          </span>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
