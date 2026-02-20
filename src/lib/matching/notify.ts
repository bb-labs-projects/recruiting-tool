import 'server-only'

import { Resend } from 'resend'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getJobById } from '@/lib/dal/jobs'
import {
  getUnnotifiedMatches,
  markMatchesNotified,
} from '@/lib/dal/job-matches'

const resend = new Resend(process.env.RESEND_API_KEY)

function chunks<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}

/**
 * Send post-matching notification emails to employer and matched candidates.
 * Best-effort: failures are logged but never thrown. Notification failure
 * must NOT crash the matching pipeline.
 */
export async function notifyMatchResults(
  jobId: string,
  matchCount: number
): Promise<void> {
  try {
    const appName = process.env.APP_NAME ?? 'IP Lawyer Recruiting'
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000'
    const emailFrom = `${appName} <${process.env.EMAIL_FROM}>`

    const job = await getJobById(jobId)
    if (!job) return

    const unnotifiedMatches = await getUnnotifiedMatches(jobId, 25)
    if (unnotifiedMatches.length === 0) return

    const topScore = unnotifiedMatches[0].overallScore

    // Send employer notification
    await resend.emails.send({
      from: emailFrom,
      to: [job.employerEmail],
      subject: `${unnotifiedMatches.length} candidates match your "${job.title}" posting`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding:32px 32px 24px;">
              <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;">
                New Candidate Matches
              </h1>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#52525b;">
                We found ${unnotifiedMatches.length} candidates matching your job requirements for <strong>${job.title}</strong>. The top candidate scored ${topScore}/100.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td style="border-radius:6px;background-color:#18181b;">
                    <a href="${appUrl}/employer/jobs/${jobId}" target="_blank" style="display:inline-block;padding:12px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">
                      View Matches
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim(),
    })

    // Send candidate notification emails (only for candidates with platform accounts)
    const candidateEmails: {
      from: string
      to: string[]
      subject: string
      html: string
    }[] = []

    for (const match of unnotifiedMatches) {
      const profile = await db.query.profiles.findFirst({
        where: (p, { eq: e }) => e(p.id, match.profileId),
        columns: { userId: true },
      })

      if (!profile?.userId) continue

      const [user] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, profile.userId))
        .limit(1)

      if (!user) continue

      candidateEmails.push({
        from: emailFrom,
        to: [user.email],
        subject: `New job match: "${job.title}"`,
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding:32px 32px 24px;">
              <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;">
                New Job Match
              </h1>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#52525b;">
                A new job posting matches your profile. You've been rated as a <strong>"${match.recommendation}"</strong>.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td style="border-radius:6px;background-color:#18181b;">
                    <a href="${appUrl}/candidate" target="_blank" style="display:inline-block;padding:12px 32px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">
                      View Your Profile
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `.trim(),
      })
    }

    // Send candidate emails in batches of 100
    for (const batch of chunks(candidateEmails, 100)) {
      await resend.batch.send(batch)
    }

    // Mark all matches as notified
    await markMatchesNotified(unnotifiedMatches.map((m) => m.id))
  } catch (error) {
    console.error('Notification failed (non-fatal):', error)
  }
}
