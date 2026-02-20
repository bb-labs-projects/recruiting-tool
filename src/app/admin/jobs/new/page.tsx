import { db } from '@/lib/db'
import { employerProfiles, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { AdminJobCreateForm } from './admin-job-create-form'

export default async function AdminNewJobPage() {
  const employers = await db
    .select({
      userId: employerProfiles.userId,
      companyName: employerProfiles.companyName,
      userEmail: users.email,
    })
    .from(employerProfiles)
    .innerJoin(users, eq(employerProfiles.userId, users.id))
    .where(eq(employerProfiles.status, 'approved'))

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Create Job for Employer
        </h1>
        <p className="text-muted-foreground">
          Create a job listing on behalf of an approved employer
        </p>
      </div>

      <AdminJobCreateForm employers={employers} />
    </div>
  )
}
