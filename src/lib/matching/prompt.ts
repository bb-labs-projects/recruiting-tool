import type { JobForScoring, CandidateForScoring } from './schema'

export function buildScoringPrompt(
  job: JobForScoring,
  candidate: CandidateForScoring
): string {
  return `You are an expert IP law recruiter evaluating candidate fit for a job opening.

Score this candidate against the job requirements using the following rubric. For each dimension, provide a score from 0-100 and a brief explanation.

## Scoring Scale
- 90-100: Exact match or exceeds requirements
- 70-89: Strong match with minor gaps
- 50-69: Partial match, some relevant experience
- 25-49: Weak match, tangentially related
- 0-24: No relevant match

## Job Requirements
- Title: ${job.title}
- Required Specializations: ${job.requiredSpecializations.join(', ') || 'None specified'}
- Preferred Specializations: ${job.preferredSpecializations.join(', ') || 'None specified'}
- Minimum Experience: ${job.minimumExperience ? `${job.minimumExperience} years` : 'Not specified'}
- Preferred Location: ${job.preferredLocation || 'Not specified'}
- Required Bar Admissions: ${job.requiredBar.join(', ') || 'None specified'}
- Required Technical Domains: ${job.requiredTechnicalDomains.join(', ') || 'None specified'}
${job.description ? `- Description: ${job.description}` : ''}

## Candidate Profile
- Specializations: ${candidate.specializations.join(', ') || 'None listed'}
- Years of Experience: ${candidate.experienceYears}
- Education: ${candidate.education.map((e) => `${e.degree} in ${e.field} from ${e.institution}`).join('; ') || 'None listed'}
- Bar Admissions: ${candidate.barAdmissions.join(', ') || 'None listed'}
- Technical Domains: ${candidate.technicalDomains.join(', ') || 'None listed'}

## Scoring Dimensions
1. **Specialization Match** (weight: 30%): How well do the candidate's IP specializations match the required and preferred specializations?
2. **Experience Fit** (weight: 25%): Does the candidate meet the minimum experience requirement? How well does their experience level match?
3. **Technical Background** (weight: 20%): Does the candidate have the required technical domains?
4. **Location Match** (weight: 10%): Is the candidate admitted in the preferred location or nearby jurisdictions?
5. **Bar Admissions** (weight: 15%): Does the candidate hold the required bar admissions?

Calculate the overall score as a weighted average of the dimension scores using the weights above.

Provide a plain-English summary (2-3 sentences) explaining the overall fit.

Provide a recommendation: "Strong Match" (75+), "Good Match" (50-74), "Partial Match" (25-49), or "Weak Match" (0-24).`
}
