import { getUser } from '@/lib/dal'
import { redirect } from 'next/navigation'

/**
 * Employer layout -- verifies employer role and provides content padding.
 * Auth is already verified by the parent (authenticated) layout.
 * Navigation is rendered in the parent header via HeaderNav.
 */
export default async function EmployerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  if (!user || user.role !== 'employer') {
    redirect('/login')
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
  )
}
