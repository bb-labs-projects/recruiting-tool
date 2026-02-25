import { redirect } from 'next/navigation'
import { getUser } from '@/lib/dal'
import { getEmployerProfile } from '@/lib/dal/admin-employers'
import { TOB_PLACEHOLDER_TEXT } from '@/lib/tob-constants'
import { TobAcceptanceForm } from '@/components/employer/tob-acceptance-form'

export default async function TermsPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const profile = await getEmployerProfile(user.id)
  if (!profile) redirect('/employer/register')

  if (profile.tobAcceptedAt) {
    redirect('/employer/browse')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="mb-2">
        <h1 className="font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight">
          Terms of Business
        </h1>
        <p className="text-muted-foreground mt-1">
          Please review and accept our Terms of Business to continue
        </p>
      </div>

      <div className="rounded-xl border bg-muted/30 p-6">
        <pre className="whitespace-pre-wrap text-sm leading-relaxed">
          {TOB_PLACEHOLDER_TEXT}
        </pre>
      </div>

      <TobAcceptanceForm />
    </div>
  )
}
