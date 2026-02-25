import 'server-only'

import { db } from '@/lib/db'
import { getJobById, updateJobMatchingStatus } from '@/lib/dal/jobs'
import {
  getMatchByJobAndProfile,
  insertMatch,
} from '@/lib/dal/job-matches'
import { preFilterCandidates } from './pre-filter'
import { scoreCandidate } from './score'
import { notifyMatchResults } from './notify'
import type { JobForScoring, CandidateForScoring } from './schema'

function computeExperienceYears(
  workHistory: { startDate: string | null; endDate: string | null }[]
): number {
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
  return Math.round(totalMonths / 12)
}

/**
 * Orchestrator: pre-filter -> load candidate data -> score -> cache -> notify.
 *
 * Per-candidate scoring errors are caught and collected without aborting
 * the entire pipeline. Notifications are best-effort (never crash pipeline).
 */
export async function runMatchingForJob(
  jobId: string
): Promise<{ matchCount: number; errors: string[] }> {
  const job = await getJobById(jobId)
  if (!job) {
    throw new Error(`Job ${jobId} not found`)
  }

  await updateJobMatchingStatus(jobId, 'running')

  try {
    const jobForScoring: JobForScoring = {
      title: job.title,
      description: job.description,
      requiredSpecializations: job.requiredSpecializations ?? [],
      preferredSpecializations: job.preferredSpecializations ?? [],
      minimumExperience: job.minimumExperience,
      preferredLocation: job.preferredLocation,
      requiredBar: job.requiredBar ?? [],
      requiredTechnicalDomains: job.requiredTechnicalDomains ?? [],
    }

    const shortlist = await preFilterCandidates(
      {
        requiredSpecializations: jobForScoring.requiredSpecializations,
        requiredBar: jobForScoring.requiredBar,
        requiredTechnicalDomains: jobForScoring.requiredTechnicalDomains,
      },
      job.employerUserId,
    )

    let matchCount = 0
    const errors: string[] = []

    for (const profileId of shortlist) {
      try {
        // Check cache: skip if already scored after the job was last updated
        const cached = await getMatchByJobAndProfile(jobId, profileId)
        if (cached && cached.scoredAt > job.updatedAt) {
          matchCount++
          continue
        }

        // Load candidate data for scoring (NO PII)
        const profile = await db.query.profiles.findFirst({
          where: (p, { eq: e }) => e(p.id, profileId),
          columns: { id: true },
          with: {
            profileSpecializations: {
              with: {
                specialization: { columns: { name: true } },
              },
            },
            profileTechnicalDomains: {
              with: {
                technicalDomain: { columns: { name: true } },
              },
            },
            education: {
              columns: { institution: true, degree: true, field: true },
            },
            barAdmissions: {
              columns: { jurisdiction: true },
            },
            workHistory: {
              columns: { startDate: true, endDate: true },
            },
          },
        })

        if (!profile) {
          errors.push(`Profile ${profileId} not found`)
          continue
        }

        const candidateForScoring: CandidateForScoring = {
          specializations: profile.profileSpecializations.map(
            (ps) => ps.specialization.name
          ),
          experienceYears: computeExperienceYears(profile.workHistory),
          education: profile.education.map((e) => ({
            institution: e.institution,
            degree: e.degree,
            field: e.field,
          })),
          barAdmissions: profile.barAdmissions.map((ba) => ba.jurisdiction),
          technicalDomains: profile.profileTechnicalDomains.map(
            (ptd) => ptd.technicalDomain.name
          ),
        }

        const score = await scoreCandidate(jobForScoring, candidateForScoring)

        await insertMatch({
          jobId,
          profileId,
          overallScore: score.overallScore,
          subscores: {
            specializationMatch: score.specializationMatch,
            experienceFit: score.experienceFit,
            technicalBackground: score.technicalBackground,
            locationMatch: score.locationMatch,
            barAdmissions: score.barAdmissions,
          },
          summary: score.summary,
          recommendation: score.recommendation,
        })

        matchCount++
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unknown scoring error'
        errors.push(`Profile ${profileId}: ${message}`)
      }
    }

    if (matchCount === 0 && errors.length > 0 && shortlist.length > 0) {
      await updateJobMatchingStatus(jobId, 'failed')
    } else {
      await updateJobMatchingStatus(jobId, 'completed')
    }

    // Automatic notifications (best-effort, never crashes pipeline)
    await notifyMatchResults(jobId, matchCount)

    return { matchCount, errors }
  } catch (err) {
    await updateJobMatchingStatus(jobId, 'failed')
    throw err
  }
}
