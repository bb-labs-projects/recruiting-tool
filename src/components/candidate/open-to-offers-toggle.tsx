'use client'

import { useTransition } from 'react'
import { toggleOpenToOffers } from '@/actions/candidate-profiles'

export function OpenToOffersToggle({
  profileId,
  initialValue,
}: {
  profileId: string
  initialValue: boolean
}) {
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      const formData = new FormData()
      formData.set('profileId', profileId)
      formData.set('openToOffers', String(!initialValue))
      await toggleOpenToOffers(formData)
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className="flex items-center gap-3 group disabled:opacity-60"
    >
      {/* Toggle track */}
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
          initialValue
            ? 'bg-[oklch(0.55_0.14_155)]'
            : 'bg-[oklch(0.85_0_0)]'
        }`}
      >
        {/* Toggle thumb */}
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5 ${
            initialValue ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </span>
      <span className="text-[13px] text-[oklch(0.40_0_0)]">
        {isPending
          ? 'Updating...'
          : initialValue
          ? 'Open to offers'
          : 'Not open to offers'}
      </span>
    </button>
  )
}
