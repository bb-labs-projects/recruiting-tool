import { getUser } from '@/lib/dal'
import { redirect } from 'next/navigation'
import { CandidateNav } from './nav'

/**
 * Candidate layout -- verifies candidate role and provides navigation.
 * Auth is already verified by the parent (authenticated) layout.
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
    <div>
      <CandidateNav />
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  )
}
