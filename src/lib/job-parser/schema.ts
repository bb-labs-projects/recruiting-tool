import { z } from 'zod'

export const ConfidenceLevel = z.enum(['high', 'medium', 'low'])

const withConfidence = <T extends z.ZodType>(valueSchema: T) =>
  z.object({
    value: valueSchema,
    confidence: ConfidenceLevel,
  })

export const JobAdParsedDataSchema = z.object({
  title: withConfidence(z.string()),
  description: withConfidence(z.string()),
  companyName: withConfidence(z.string()),
  location: withConfidence(z.string()),
  requiredSpecializations: withConfidence(z.array(z.string())),
  preferredSpecializations: withConfidence(z.array(z.string())),
  minimumExperience: withConfidence(z.number().nullable()),
  requiredBar: withConfidence(z.array(z.string())),
  requiredTechnicalDomains: withConfidence(z.array(z.string())),
  compensation: withConfidence(z.string()),
  employmentType: withConfidence(z.string()),
})

export type JobAdParsedData = z.infer<typeof JobAdParsedDataSchema>
