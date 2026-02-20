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
      <div className="p-6">{children}</div>
    </div>
  )
}
