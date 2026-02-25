import { z } from 'zod'

const DimensionScore = z.object({
  score: z.number().int().min(0).max(100),
  explanation: z.string(),
})

export const RequirementTag = z.object({
  requirement: z.string(),
  status: z.enum(['met', 'partial', 'unmet', 'unknown']),
})

export type RequirementTag = z.infer<typeof RequirementTag>

export const MatchScoreSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  specializationMatch: DimensionScore,
  experienceFit: DimensionScore,
  technicalBackground: DimensionScore,
  credentials: DimensionScore,
  locationAndLanguage: DimensionScore,
  leadershipAndBD: DimensionScore,
  requirementTags: z.array(RequirementTag),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
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
  preferredLanguages: string[]
}

/**
 * Anonymized candidate data for scoring. NEVER includes name, email, phone, or employer names.
 */
export type CandidateForScoring = {
  specializations: string[]
  experienceYears: number
  education: { institution: string; degree: string; field: string }[]
  barAdmissions: { jurisdiction: string; year: string | null; status: string | null }[]
  technicalDomains: string[]
  languages: { language: string; proficiency: string | null }[]
  workHistoryTitles: string[]
  workHistoryDescriptions: string[]
}
