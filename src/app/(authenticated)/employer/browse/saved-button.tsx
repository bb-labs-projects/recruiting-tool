'use client'

import { useOptimistic, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toggleSaveProfile } from '@/actions/saved-profiles'
import { cn } from '@/lib/utils'

/**
 * Save/unsave button for candidate profiles.
 * Uses optimistic UI for instant visual feedback before server round-trip.
 * Shows filled red heart when saved, outline heart when not.
 */
export function SaveButton({
  profileId,
  initialSaved,
  size = 'default',
}: {
  profileId: string
  initialSaved: boolean
  size?: 'sm' | 'default'
}) {
  const [isPending, startTransition] = useTransition()
  const [optimisticSaved, setOptimisticSaved] = useOptimistic(initialSaved)

  function handleClick() {
    startTransition(async () => {
      setOptimisticSaved(!optimisticSaved)
      await toggleSaveProfile(profileId)
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={isPending}
      aria-label={optimisticSaved ? 'Unsave profile' : 'Save profile'}
      className={cn(
        size === 'sm' && 'size-8'
      )}
    >
      <Heart
        className={cn(
          'size-5',
          optimisticSaved && 'fill-red-500 text-red-500'
        )}
      />
    </Button>
  )
}
