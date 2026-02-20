import { z } from 'zod'

export const ConfidenceLevel = z.enum(['high', 'medium', 'low'])
export type ConfidenceLevel = z.infer<typeof ConfidenceLevel>

// Helper: wrap a value schema with confidence
const withConfidence = <T extends z.ZodType>(valueSchema: T) =>
  z.object({
    value: valueSchema,
    confidence: ConfidenceLevel,
  })

const EducationEntry = z.object({
  institution: z.string(),
  degree: z.string(),
  field: z.string(),
  year: z.string(), // YYYY or empty string if unknown
})

const BarAdmissionEntry = z.object({
  jurisdiction: z.string(),
  year: z.string(), // YYYY or empty string
  status: z.string(), // "active", "inactive", or empty string
})

const WorkHistoryEntry = z.object({
  employer: z.string(),
  title: z.string(),
  startDate: z.string(), // YYYY or YYYY-MM or empty string
  endDate: z.string(), // YYYY or YYYY-MM or "Present" or empty string
  description: z.string(),
})

export const CvParsedDataSchema = z.object({
  name: withConfidence(z.string()),
  email: withConfidence(z.string()),
  phone: withConfidence(z.string()),
  specializations: withConfidence(z.array(z.string())),
  education: withConfidence(z.array(EducationEntry)),
  technicalBackground: withConfidence(z.array(z.string())),
  barAdmissions: withConfidence(z.array(BarAdmissionEntry)),
  workHistory: withConfidence(z.array(WorkHistoryEntry)),
})

export type CvParsedData = z.infer<typeof CvParsedDataSchema>
