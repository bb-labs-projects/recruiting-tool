import type { JobForScoring, CandidateForScoring } from './schema'

export function buildScoringPrompt(
  job: JobForScoring,
  candidate: CandidateForScoring
): string {
  const barAdmissionsText = candidate.barAdmissions.length
    ? candidate.barAdmissions
        .map(
          (ba) =>
            `${ba.jurisdiction}${ba.year ? ` (${ba.year})` : ''}${ba.status ? ` [${ba.status}]` : ''}`
        )
        .join('; ')
    : 'None listed'

  const languagesText = candidate.languages.length
    ? candidate.languages
        .map(
          (l) =>
            `${l.language}${l.proficiency ? ` (${l.proficiency})` : ''}`
        )
        .join(', ')
    : 'None listed'

  const workTitlesText = candidate.workHistoryTitles.length
    ? candidate.workHistoryTitles.join(', ')
    : 'None listed'

  const workDescriptionsText = candidate.workHistoryDescriptions.length
    ? candidate.workHistoryDescriptions.join('\n  - ')
    : 'None listed'

  const preferredLanguagesText = job.preferredLanguages.length
    ? job.preferredLanguages.join(', ')
    : 'Not specified'

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
- Preferred Languages: ${preferredLanguagesText}
${job.description ? `- Description: ${job.description}` : ''}

## Candidate Profile
- Specializations: ${candidate.specializations.join(', ') || 'None listed'}
- Years of Experience: ${candidate.experienceYears}
- Education: ${candidate.education.map((e) => `${e.degree} in ${e.field} from ${e.institution}`).join('; ') || 'None listed'}
- Bar Admissions: ${barAdmissionsText}
- Technical Domains: ${candidate.technicalDomains.join(', ') || 'None listed'}
- Languages: ${languagesText}
- Work Titles: ${workTitlesText}
- Work Descriptions:
  - ${workDescriptionsText}

## Scoring Dimensions
1. **Specialization Match** (weight: 25%): How well do the candidate's IP specializations match the required and preferred specializations?
2. **Experience Fit** (weight: 20%): Does the candidate meet the minimum experience requirement? How well does their experience level match?
3. **Technical Background** (weight: 15%): Does the candidate have the required technical domains?
4. **Credentials** (weight: 15%): Does the candidate hold the required bar admissions? Consider admission year and active status.
5. **Location & Language** (weight: 15%): Is the candidate in or near the preferred location? Do they speak required or preferred languages?
6. **Leadership & Business Development** (weight: 10%): Does the candidate show evidence of leadership roles, client development, team management, or business development from their work titles and descriptions?

Calculate the overall score as a weighted average of the dimension scores using the weights above.

## Requirement Tags
Identify each hard requirement from the job (e.g., specific bar admission, minimum experience, required specialization, required technical domain). For each, output a requirement tag with:
- "requirement": short label of the requirement
- "status": "met" if clearly satisfied, "partial" if partially satisfied, "unmet" if not satisfied, "unknown" if insufficient data

## Strengths & Gaps
- "strengths": 2-4 bullet points highlighting the candidate's strongest selling points for this role
- "gaps": 1-3 bullet points noting areas where the candidate falls short or has unknowns

Provide a plain-English summary (2-3 sentences) explaining the overall fit.

Provide a recommendation: "Strong Match" (75+), "Good Match" (50-74), "Partial Match" (25-49), or "Weak Match" (0-24).`
}
