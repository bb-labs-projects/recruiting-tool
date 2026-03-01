/**
 * Pure LinkedIn quality signal computation.
 * No DB access -- takes profile data and computes verification signals.
 */

export type LinkedInSignal = {
  label: string
  status: 'verified' | 'mismatch' | 'pending'
  detail: string
}

export type LinkedInQualityResult = {
  connected: boolean
  signals: LinkedInSignal[]
  verifiedCount: number
  totalSignals: number
}

type ProfileInput = {
  linkedinSub: string | null
  linkedinName: string | null
  linkedinEmail: string | null
  linkedinPictureUrl: string | null
  name: string
  email: string | null
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

export function computeLinkedInQuality(
  profile: ProfileInput,
  userEmail: string
): LinkedInQualityResult {
  const connected = !!profile.linkedinSub
  const signals: LinkedInSignal[] = []

  // 1. LinkedIn Connected
  signals.push({
    label: 'LinkedIn Connected',
    status: connected ? 'verified' : 'pending',
    detail: connected ? 'Account linked' : 'Not connected',
  })

  // 2. Name Match
  if (!connected) {
    signals.push({
      label: 'Name Match',
      status: 'pending',
      detail: 'Connect LinkedIn to verify',
    })
  } else if (profile.linkedinName) {
    const match = normalizeName(profile.linkedinName) === normalizeName(profile.name)
    signals.push({
      label: 'Name Match',
      status: match ? 'verified' : 'mismatch',
      detail: match
        ? 'Name matches LinkedIn'
        : `LinkedIn: ${profile.linkedinName}`,
    })
  } else {
    signals.push({
      label: 'Name Match',
      status: 'pending',
      detail: 'Name not available from LinkedIn',
    })
  }

  // 3. Email Match
  if (!connected) {
    signals.push({
      label: 'Email Match',
      status: 'pending',
      detail: 'Connect LinkedIn to verify',
    })
  } else if (profile.linkedinEmail) {
    const emailLower = profile.linkedinEmail.toLowerCase()
    const match =
      emailLower === userEmail.toLowerCase() ||
      (profile.email ? emailLower === profile.email.toLowerCase() : false)
    signals.push({
      label: 'Email Match',
      status: match ? 'verified' : 'mismatch',
      detail: match
        ? 'Email matches LinkedIn'
        : 'LinkedIn email differs',
    })
  } else {
    signals.push({
      label: 'Email Match',
      status: 'pending',
      detail: 'Email not available from LinkedIn',
    })
  }

  // 4. Profile Photo
  if (!connected) {
    signals.push({
      label: 'Profile Photo',
      status: 'pending',
      detail: 'Connect LinkedIn to verify',
    })
  } else {
    const hasPhoto = !!profile.linkedinPictureUrl
    signals.push({
      label: 'Profile Photo',
      status: hasPhoto ? 'verified' : 'pending',
      detail: hasPhoto ? 'Photo available' : 'No LinkedIn photo',
    })
  }

  const verifiedCount = signals.filter((s) => s.status === 'verified').length

  return {
    connected,
    signals,
    verifiedCount,
    totalSignals: signals.length,
  }
}
