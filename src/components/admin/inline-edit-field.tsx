'use client'

import { useState, useRef, useTransition, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { ConfidenceBadge } from '@/components/admin/confidence-badge'
import { Pencil } from 'lucide-react'

interface InlineEditFieldProps {
  profileId: string
  fieldName: string
  value: string
  confidence: 'high' | 'medium' | 'low'
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>
  label: string
}

export function InlineEditField({
  profileId,
  fieldName,
  value,
  confidence,
  action,
  label,
}: InlineEditFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep editValue in sync if the prop changes from the server
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value)
    }
  }, [value, isEditing])

  function enterEditMode() {
    setEditValue(value)
    setError(null)
    setIsEditing(true)
  }

  // Focus the input after switching to edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  function cancel() {
    setEditValue(value)
    setError(null)
    setIsEditing(false)
  }

  function save() {
    if (editValue === value) {
      setIsEditing(false)
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.set('value', editValue)
      const result = await action(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setError(null)
        setIsEditing(false)
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      save()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    }
  }

  if (isEditing) {
    return (
      <div className="space-y-1">
        <label className="text-muted-foreground text-xs font-medium">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={save}
            disabled={isPending}
            className={isPending ? 'opacity-50' : ''}
          />
        </div>
        {isPending && (
          <p className="text-muted-foreground text-xs">Saving...</p>
        )}
        {error && <p className="text-destructive text-xs">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <label className="text-muted-foreground text-xs font-medium">
        {label}
      </label>
      <div
        role="button"
        tabIndex={0}
        onClick={enterEditMode}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            enterEditMode()
          }
        }}
        className="group flex items-center gap-2 rounded-md px-2 py-1 -mx-2 cursor-pointer hover:bg-muted/50 transition-colors"
      >
        <span className={value ? '' : 'text-muted-foreground italic'}>
          {value || '(empty)'}
        </span>
        <ConfidenceBadge level={confidence} className="text-[10px] px-1.5 py-0" />
        <Pencil className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" />
      </div>
    </div>
  )
}
