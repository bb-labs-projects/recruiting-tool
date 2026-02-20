import { getUser } from '@/lib/dal'
import { redirect } from 'next/navigation'

/**
 * Employer layout -- verifies employer role and provides padding.
 * Auth is already verified by the parent (authenticated) layout.
 *
 * Approval-status gating is handled at the PAGE level (not here)
 * because Next.js layouts do not re-render on client-side navigation
 * and cannot reliably read the current pathname. Each page checks
 * the employer profile status and redirects accordingly.
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

  return <div className="p-6">{children}</div>
}
