import { z } from 'zod'

const DimensionScore = z.object({
  score: z.number().int().min(0).max(100),
  explanation: z.string(),
})

export const MatchScoreSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  specializationMatch: DimensionScore,
  experienceFit: DimensionScore,
  technicalBackground: DimensionScore,
  locationMatch: DimensionScore,
  barAdmissions: DimensionScore,
  summary: z.string(),
  recommendation: z.enum([
    'Strong Match',
    'Good Match',
    'Partial Match',
    'Weak Match',
  ]),
})

export type MatchScore = z.infer<typeof MatchScoreSchema>

/**
 * Job data passed to the scoring prompt. No PII.
 */
export type JobForScoring = {
  title: string
  description: string | null
  requiredSpecializations: string[]
  preferredSpecializations: string[]
  minimumExperience: number | null
  preferredLocation: string | null
  requiredBar: string[]
  requiredTechnicalDomains: string[]
}

/**
 * Anonymized candidate data for scoring. NEVER includes name, email, phone, or employer names.
 */
export type CandidateForScoring = {
  specializations: string[]
  experienceYears: number
  education: { institution: string; degree: string; field: string }[]
  barAdmissions: string[]
  technicalDomains: string[]
}
