function scoreColor(score: number): string {
  if (score >= 80) return 'text-[oklch(0.55_0.14_155)]'
  if (score >= 60) return 'text-[oklch(0.70_0.12_75)]'
  return 'text-[oklch(0.55_0.16_20)]'
}

export function ScoreRing({
  score,
  size = 'default',
}: {
  score: number
  size?: 'sm' | 'default'
}) {
  const textSize = size === 'sm' ? 'text-base' : 'text-[20px]'

  return (
    <span className={`font-mono font-bold ${textSize} ${scoreColor(score)}`}>
      {score}
    </span>
  )
}
