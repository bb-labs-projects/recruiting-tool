import Image from 'next/image'
import { CheckCircle2, AlertCircle, Circle } from 'lucide-react'
import type { LinkedInQualityResult } from '@/lib/linkedin-quality'

const statusIcon = {
  verified: <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />,
  mismatch: <AlertCircle className="size-4 text-amber-500 shrink-0" />,
  pending: <Circle className="size-4 text-muted-foreground/50 shrink-0" />,
} as const

export function LinkedInQuality({
  result,
  linkedinPictureUrl,
  linkedinName,
}: {
  result: LinkedInQualityResult
  linkedinPictureUrl: string | null
  linkedinName: string | null
}) {
  if (!result.connected) {
    // Not connected state -- prompt card
    return (
      <div className="mb-10">
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <svg
              className="size-5 text-muted-foreground shrink-0"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            <div>
              <p className="text-[13px] font-medium text-foreground">
                Verify your identity
              </p>
              <p className="text-[12px] text-muted-foreground">
                Connect LinkedIn to add a trust signal to your profile
              </p>
            </div>
          </div>
          <a
            href="/api/linkedin/authorize"
            className="text-[13px] text-brand font-medium hover:underline shrink-0"
          >
            Connect LinkedIn
          </a>
        </div>
        <div className="border-t border-border mt-10" />
      </div>
    )
  }

  // Connected state -- signal checklist
  return (
    <div className="mb-10">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium mb-4">
        LinkedIn Verification
      </h2>

      {/* Profile thumbnail + verified name */}
      {(linkedinPictureUrl || linkedinName) && (
        <div className="flex items-center gap-2.5 mb-4">
          {linkedinPictureUrl && (
            <Image
              src={linkedinPictureUrl}
              alt=""
              width={28}
              height={28}
              className="rounded-full"
            />
          )}
          {linkedinName && (
            <span className="text-[13px] text-foreground font-medium">
              {linkedinName}
            </span>
          )}
        </div>
      )}

      {/* Signal checklist */}
      <div className="space-y-2.5">
        {result.signals.map((signal) => (
          <div key={signal.label} className="flex items-center gap-2.5">
            {statusIcon[signal.status]}
            <div className="flex items-baseline gap-2">
              <span className="text-[13px] text-foreground">
                {signal.label}
              </span>
              <span className="text-[12px] text-muted-foreground">
                {signal.detail}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border mt-10" />
    </div>
  )
}
