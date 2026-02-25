import { getAllEmployerProfiles } from '@/lib/dal/admin-employers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { columns, type EmployerRow } from './columns'
import { DataTable } from './data-table'

export default async function EmployersPage() {
  const allEmployers = await getAllEmployerProfiles()

  const employerRows: EmployerRow[] = allEmployers.map((employer) => ({
    id: employer.id,
    companyName: employer.companyName,
    contactName: employer.contactName,
    contactTitle: employer.contactTitle,
    status: employer.status,
    createdAt: employer.createdAt.toISOString(),
    reviewedAt: employer.reviewedAt?.toISOString() ?? null,
    userEmail: employer.userEmail,
    corporateEmailDomain: employer.corporateEmailDomain ?? null,
    isFreemailDomain: employer.isFreemailDomain,
    tobAcceptedAt: employer.tobAcceptedAt?.toISOString() ?? null,
  }))

  // Compute summary counts
  const totalCount = employerRows.length
  const pendingCount = employerRows.filter(
    (r) => r.status === 'pending'
  ).length
  const approvedCount = employerRows.filter(
    (r) => r.status === 'approved'
  ).length
  const rejectedCount = employerRows.filter(
    (r) => r.status === 'rejected'
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight font-[family-name:var(--font-outfit)]">
          Employer Management
        </h1>
        <p className="text-muted-foreground">
          Review and manage employer accounts
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
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-[family-name:var(--font-outfit)] text-amber-600">
              {pendingCount}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-[family-name:var(--font-outfit)] text-teal-600">
              {approvedCount}
            </p>
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
      <DataTable columns={columns} data={employerRows} />
    </div>
  )
}
