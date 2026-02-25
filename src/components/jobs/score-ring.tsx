function ringColor(score: number): string {
  if (score >= 85) return 'text-green-500'
  if (score >= 65) return 'text-amber-500'
  return 'text-red-500'
}

export function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const strokeWidth = size * 0.1
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(Math.max(score, 0), 100) / 100
  const offset = circumference * (1 - progress)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={ringColor(score)}
        />
      </svg>
      <span
        className="absolute text-center font-bold leading-none"
        style={{ fontSize: size * 0.3 }}
      >
        {score}
      </span>
    </div>
  )
}
