import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { MatchScoreSchema } from './schema'
import type { MatchScore, JobForScoring, CandidateForScoring } from './schema'
import { buildScoringPrompt } from './prompt'

const anthropic = new Anthropic()

/**
 * Score a single candidate against a job using Claude Haiku 4.5.
 * Returns a structured MatchScore with dimension sub-scores.
 *
 * CRITICAL: The candidate data passed here must NEVER contain PII
 * (no name, email, phone, or employer names).
 */
export async function scoreCandidate(
  job: JobForScoring,
  candidate: CandidateForScoring
): Promise<MatchScore> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: buildScoringPrompt(job, candidate),
      },
    ],
    output_config: {
      format: zodOutputFormat(MatchScoreSchema),
    },
  })

  const firstBlock = response.content[0]
  if (!firstBlock || firstBlock.type !== 'text') {
    throw new Error('Unexpected response format: no text content block')
  }

  return MatchScoreSchema.parse(JSON.parse(firstBlock.text))
}
