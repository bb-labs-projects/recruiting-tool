import { getUser } from '@/lib/dal'
import { redirect } from 'next/navigation'
import { EmployerNav } from './nav'

/**
 * Employer layout -- verifies employer role and provides navigation + padding.
 * Auth is already verified by the parent (authenticated) layout.
 *
 * Approval-status gating is handled at the PAGE level (not here)
 * because Next.js layouts do not re-render on client-side navigation
 * and cannot reliably read the current pathname. Each page checks
 * the employer profile status and redirects accordingly.
 *
 * Navigation links are always rendered; unapproved employers who click
 * Browse or Saved will be redirected by those pages' approval gates.
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
    <div>
      <EmployerNav />
      <div className="p-6">{children}</div>
    </div>
  )
}
