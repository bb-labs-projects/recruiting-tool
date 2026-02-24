import { redirect } from 'next/navigation'
import { getUser } from '@/lib/dal'
import { LogoutButton } from '@/components/auth/logout-button'

/**
 * Admin layout -- wraps all admin pages.
 * Verifies both authentication and admin role via the DAL.
 * If not authenticated or not admin, redirects to /login.
 *
 * Renders admin shell with sidebar navigation and main content area.
 * Includes LogoutButton in both the sidebar footer and the top header.
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

  const navLinks = [
    { name: 'Dashboard', href: '/admin' },
    { name: 'CV Upload', href: '/admin/cv-upload' },
    { name: 'Candidates', href: '/admin/candidates' },
    { name: 'Employers', href: '/admin/employers' },
    { name: 'Jobs', href: '/admin/jobs' },
    { name: 'Analytics', href: '/admin/analytics' },
    { name: 'Users', href: '/admin/users' },
  ]

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col bg-gray-900 text-white">
        <div className="flex h-14 items-center gap-2 border-b border-gray-700 px-6">
          <span className="text-lg font-semibold">Admin</span>
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
            admin
          </span>
        </div>
        <nav className="flex-1 px-4 py-4">
          <ul className="space-y-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="block rounded-md px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
                >
                  {link.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-gray-700 px-6 py-4">
          <p className="truncate text-sm text-gray-400">{user.email}</p>
          <div className="mt-2">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-background px-6">
          <span className="text-sm text-muted-foreground">
            Signed in as {user.email}
          </span>
          <LogoutButton />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
