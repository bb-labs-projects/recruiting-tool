import { getUser } from '@/lib/dal'
import { redirect } from 'next/navigation'

/**
 * Candidate layout -- verifies candidate role and provides content padding.
 * Auth is already verified by the parent (authenticated) layout.
 * Navigation is rendered in the parent header via HeaderNav.
 */
export default async function CandidateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  if (!user || user.role !== 'candidate') {
    redirect('/login')
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
  )
}
