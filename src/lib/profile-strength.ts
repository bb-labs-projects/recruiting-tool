/**
 * Pure profile-strength score computation.
 * No DB access -- takes the profile object from getCandidateProfile().
 */

export type ProfileDimension = {
  label: string
  weight: number
  score: number // 0-1
  complete: boolean
  tip: string | null
  href: string | null
}

export type ProfileStrengthResult = {
  overallScore: number
  dimensions: ProfileDimension[]
  completedCount: number
  totalCount: number
}

type ProfileInput = {
  profileSpecializations: unknown[]
  profileTechnicalDomains: unknown[]
  workHistory: { startDate: string | null; endDate: string | null; description: string | null }[]
  education: unknown[]
  barAdmissions: unknown[]
  openToOffers: boolean
  cvUploads: unknown[]
}

export function computeProfileStrength(profile: ProfileInput): ProfileStrengthResult {
  const dimensions: ProfileDimension[] = []

  // 1. Specializations (25)
  const hasSpecs = profile.profileSpecializations.length >= 1
  dimensions.push({
    label: 'Specializations',
    weight: 25,
    score: hasSpecs ? 1 : 0,
    complete: hasSpecs,
    tip: hasSpecs ? null : 'Add specializations',
    href: hasSpecs ? null : '/candidate/profile',
  })

  // 2. Technical Domains (20)
  const hasDomains = profile.profileTechnicalDomains.length >= 1
  dimensions.push({
    label: 'Technical Domains',
    weight: 20,
    score: hasDomains ? 1 : 0,
    complete: hasDomains,
    tip: hasDomains ? null : 'Add technical domains',
    href: hasDomains ? null : '/candidate/profile',
  })

  // 3. Work History (20) -- 0.5 base + 0.25 if dates + 0.25 if descriptions
  let whScore = 0
  if (profile.workHistory.length >= 1) {
    whScore = 0.5
    const hasDates = profile.workHistory.some((wh) => wh.startDate)
    if (hasDates) whScore += 0.25
    const hasDesc = profile.workHistory.some((wh) => wh.description)
    if (hasDesc) whScore += 0.25
  }
  dimensions.push({
    label: 'Work History',
    weight: 20,
    score: whScore,
    complete: whScore === 1,
    tip: whScore === 1 ? null : whScore === 0 ? 'Add work history' : 'Add dates and descriptions',
    href: whScore === 1 ? null : '/candidate/profile',
  })

  // 4. Education (10)
  const hasEdu = profile.education.length >= 1
  dimensions.push({
    label: 'Education',
    weight: 10,
    score: hasEdu ? 1 : 0,
    complete: hasEdu,
    tip: hasEdu ? null : 'Add education',
    href: hasEdu ? null : '/candidate/profile',
  })

  // 5. Bar Admissions (10)
  const hasBar = profile.barAdmissions.length >= 1
  dimensions.push({
    label: 'Bar Admissions',
    weight: 10,
    score: hasBar ? 1 : 0,
    complete: hasBar,
    tip: hasBar ? null : 'Add bar admissions',
    href: hasBar ? null : '/candidate/profile',
  })

  // 6. Open to Offers (10)
  const isOpen = profile.openToOffers
  dimensions.push({
    label: 'Open to Offers',
    weight: 10,
    score: isOpen ? 1 : 0,
    complete: isOpen,
    tip: isOpen ? null : 'Toggle open to offers',
    href: null,
  })

  // 7. CV Uploaded (5)
  const hasCv = profile.cvUploads.length >= 1
  dimensions.push({
    label: 'CV Uploaded',
    weight: 5,
    score: hasCv ? 1 : 0,
    complete: hasCv,
    tip: hasCv ? null : 'Upload your CV',
    href: hasCv ? null : '/candidate/upload',
  })

  const overallScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.weight * d.score, 0)
  )
  const completedCount = dimensions.filter((d) => d.complete).length

  return {
    overallScore,
    dimensions,
    completedCount,
    totalCount: dimensions.length,
  }
}
