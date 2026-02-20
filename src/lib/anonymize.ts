import 'server-only'

/**
 * Bucket total years of experience into a range string.
 * Ranges: "< 2 years", "2-5 years", "5-10 years", "10-15 years", "15-20 years", "20+ years"
 *
 * Calculates total months across all work history entries, handles null dates gracefully.
 */
export function bucketExperienceYears(
  workHistory: { startDate: string | null; endDate: string | null }[]
): string {
  let totalMonths = 0

  for (const wh of workHistory) {
    if (!wh.startDate) continue
    const start = new Date(wh.startDate)
    const end = wh.endDate ? new Date(wh.endDate) : new Date()
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth())
    totalMonths += Math.max(0, months)
  }

  const years = totalMonths / 12

  if (years < 2) return '< 2 years'
  if (years < 5) return '2-5 years'
  if (years < 10) return '5-10 years'
  if (years < 15) return '10-15 years'
  if (years < 20) return '15-20 years'
  return '20+ years'
}

/**
 * Anonymize work history: suppress employer names, categorize by employer type,
 * and bucket individual durations into ranges.
 *
 * Input work history should NOT include employer names (column excluded at query level).
 * This function infers the employer type from the job title and buckets duration.
 */
export function anonymizeWorkHistory(
  workHistory: {
    title: string
    startDate: string | null
    endDate: string | null
  }[]
): { title: string; type: string; durationRange: string }[] {
  return workHistory.map((wh) => ({
    title: wh.title,
    type: inferEmployerType(wh.title),
    durationRange: bucketDuration(wh.startDate, wh.endDate),
  }))
}

/**
 * Infer employer type from job title keywords.
 * Returns "Law Firm", "In-House", "Government", or "Legal".
 */
function inferEmployerType(title: string): string {
  const lower = title.toLowerCase()
  if (
    lower.includes('partner') ||
    lower.includes('associate') ||
    lower.includes('counsel')
  )
    return 'Law Firm'
  if (lower.includes('in-house') || lower.includes('corporate'))
    return 'In-House'
  if (lower.includes('examiner') || lower.includes('government'))
    return 'Government'
  return 'Legal'
}

/**
 * Bucket an individual work history duration into a range string.
 * Returns "< 1 year", "1-3 years", "3-5 years", "5-10 years", "10+ years", or "Unknown".
 */
function bucketDuration(
  startDate: string | null,
  endDate: string | null
): string {
  if (!startDate) return 'Unknown'
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date()
  const years =
    (end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000)

  if (years < 1) return '< 1 year'
  if (years < 3) return '1-3 years'
  if (years < 5) return '3-5 years'
  if (years < 10) return '5-10 years'
  return '10+ years'
}
