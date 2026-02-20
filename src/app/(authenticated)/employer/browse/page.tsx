import { getUser } from '@/lib/dal'
import { getEmployerProfile } from '@/lib/dal/admin-employers'
import { getAnonymizedProfiles } from '@/lib/dal/employer-profiles'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SearchInput } from './search'
import { FilterBar } from './filters'
import { ProfileCard } from '@/components/employer/profile-card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Users } from 'lucide-react'

/**
 * Employer browse page -- displays anonymized candidate profile cards
 * in a responsive grid with search, filters, and pagination.
 *
 * APPROVAL GATE: Page-level check ensures only approved employers
 * can access browse. Layout only checks role, not approval status.
 *
 * SECURITY: Uses getAnonymizedProfiles DAL which NEVER selects PII
 * fields from the database (column inclusion mode).
 */
export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    spec?: string | string[]
    experience?: string
    page?: string
  }>
}) {
  // Approval gate
  const user = await getUser()
  if (!user) redirect('/login')
  const employerProfile = await getEmployerProfile(user.id)
  if (!employerProfile || employerProfile.status !== 'approved') {
    redirect('/employer')
  }

  // Read search params (Next.js 16: searchParams is a Promise)
  const params = await searchParams

  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  const pageSize = 12

  // Normalize multi-value params to arrays
  const specParam = params.spec
  const specializations = specParam
    ? Array.isArray(specParam)
      ? specParam
      : [specParam]
    : undefined

  // Fetch anonymized profiles with filters
  const { profiles, total } = await getAnonymizedProfiles({
    search: params.q,
    specializations,
    experienceRange: params.experience,
    page,
    pageSize,
  })

  const totalPages = Math.ceil(total / pageSize)

  // Build pagination URL helper
  function buildPageUrl(targetPage: number) {
    const urlParams = new URLSearchParams()
    if (params.q) urlParams.set('q', params.q)
    if (specializations) {
      for (const spec of specializations) {
        urlParams.append('spec', spec)
      }
    }
    if (params.experience) urlParams.set('experience', params.experience)
    urlParams.set('page', String(targetPage))
    return `/employer/browse?${urlParams.toString()}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Browse Candidates
        </h1>
        <p className="text-muted-foreground mt-1">
          Discover qualified IP professionals
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput />
        <FilterBar />
      </div>

      {/* Results Count */}
      <p className="text-muted-foreground text-sm">
        {total} candidate{total !== 1 ? 's' : ''} found
      </p>

      {/* Profile Cards Grid */}
      {profiles.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Users className="text-muted-foreground mb-4 size-12" />
          <h3 className="text-lg font-semibold">No candidates found</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            No candidates match your criteria. Try broadening your filters.
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild={page > 1}
            disabled={page <= 1}
          >
            {page > 1 ? (
              <Link href={buildPageUrl(page - 1)}>
                <ChevronLeft className="size-4" />
                Previous
              </Link>
            ) : (
              <>
                <ChevronLeft className="size-4" />
                Previous
              </>
            )}
          </Button>

          <span className="text-muted-foreground text-sm">
            Page {page} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            asChild={page < totalPages}
            disabled={page >= totalPages}
          >
            {page < totalPages ? (
              <Link href={buildPageUrl(page + 1)}>
                Next
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <>
                Next
                <ChevronRight className="size-4" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
