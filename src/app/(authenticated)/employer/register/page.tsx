import { redirect } from 'next/navigation'
import { getUser } from '@/lib/dal'
import { getEmployerProfile } from '@/lib/dal/admin-employers'
import { RegistrationForm } from '@/components/employer/registration-form'

/**
 * Employer registration page.
 * Only accessible when the employer has no existing profile.
 * If a profile already exists, redirects to the dashboard
 * (which will further redirect based on approval status).
 */
export default async function EmployerRegisterPage() {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await getEmployerProfile(user.id)

  if (profile) {
    redirect('/employer')
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight">
            Complete Your Registration
          </h1>
          <p className="mt-1 text-muted-foreground">
            Tell us about your company to get started
          </p>
        </div>
        <RegistrationForm />
      </div>
    </div>
  )
}
