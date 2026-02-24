import { desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { columns, type CandidateRow } from './columns'
import { DataTable } from './data-table'

export default async function CandidatesPage() {
  const allProfiles = await db.query.profiles.findMany({
    with: {
      profileSpecializations: {
        with: { specialization: true },
      },
      education: true,
      workHistory: true,
      barAdmissions: true,
      profileTechnicalDomains: {
        with: { technicalDomain: true },
      },
    },
    orderBy: [desc(profiles.createdAt)],
  })

  const confidenceRank = { high: 2, medium: 1, low: 0 } as const

  const candidateRows: CandidateRow[] = allProfiles.map((profile) => {
    // Flatten specializations from junction table
    const specializations = profile.profileSpecializations.map(
      (ps) => ps.specialization.name
    )

    // Compute lowest confidence across ALL fields
    const allConfidences: number[] = [
      confidenceRank[profile.nameConfidence],
      confidenceRank[profile.emailConfidence],
      confidenceRank[profile.phoneConfidence],
      ...profile.education.map((e) => confidenceRank[e.confidence]),
      ...profile.workHistory.map((w) => confidenceRank[w.confidence]),
      ...profile.barAdmissions.map((b) => confidenceRank[b.confidence]),
      ...profile.profileSpecializations.map(
        (s) => confidenceRank[s.confidence]
      ),
      ...profile.profileTechnicalDomains.map(
        (t) => confidenceRank[t.confidence]
      ),
    ]

    const minConfidence =
      allConfidences.length > 0 ? Math.min(...allConfidences) : 2
    const lowestConfidence: CandidateRow['lowestConfidence'] =
      minConfidence === 0 ? 'low' : minConfidence === 1 ? 'medium' : 'high'

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      status: profile.status,
      specializations,
      lowestConfidence,
      createdAt: profile.createdAt.toISOString(),
    }
  })

  // Compute summary counts
  const totalCount = candidateRows.length
  const pendingCount = candidateRows.filter(
    (r) => r.status === 'pending_review'
  ).length
  const activeCount = candidateRows.filter(
    (r) => r.status === 'active'
  ).length
  const rejectedCount = candidateRows.filter(
    (r) => r.status === 'rejected'
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight font-[family-name:var(--font-outfit)]">Candidates</h1>
        <p className="text-muted-foreground">
          Review and manage candidate profiles
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-[family-name:var(--font-outfit)]">{totalCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-[family-name:var(--font-outfit)] text-amber-600">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-[family-name:var(--font-outfit)] text-teal-600">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-[family-name:var(--font-outfit)] text-red-600">{rejectedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Data table */}
      <DataTable columns={columns} data={candidateRows} />
    </div>
  )
}
