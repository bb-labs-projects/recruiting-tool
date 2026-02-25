'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, Loader2, XCircle, FileText } from 'lucide-react'
import type { JobFormData } from './job-form'

type UploadStatus = 'idle' | 'uploading' | 'parsing' | 'error'

type JobAdUploadRecord = {
  id: string
  jobId: string | null
  filename: string
  status: 'uploaded' | 'parsing' | 'parsed' | 'failed'
  errorMessage: string | null
  createdAt: string
  parsedAt: string | null
}

interface JobAdUploadProps {
  onParsed: (data: JobFormData) => void
}

export function JobAdUpload({ onParsed }: JobAdUploadProps) {
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [filename, setFilename] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  const notifyWithJobData = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (job: any) => {
      onParsed({
        id: job.id,
        title: job.title ?? '',
        description: job.description ?? null,
        requiredSpecializations: job.requiredSpecializations ?? [],
        preferredSpecializations: job.preferredSpecializations ?? [],
        minimumExperience: job.minimumExperience ?? null,
        preferredLocation: job.preferredLocation ?? null,
        requiredBar: job.requiredBar ?? [],
        requiredTechnicalDomains: job.requiredTechnicalDomains ?? [],
      })
    },
    [onParsed]
  )

  const pollForCompletion = useCallback(
    (uploadId: string) => {
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch('/api/employer/jobs/upload-status')
          if (!res.ok) return
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const uploads: any[] = await res.json()
          const target = uploads.find((u: { id: string }) => u.id === uploadId)
          if (!target) return

          if (target.status === 'parsed' && target.jobId) {
            clearInterval(pollingRef.current!)
            pollingRef.current = null
            notifyWithJobData({
              id: target.jobId,
              title: target.jobTitle,
              description: target.jobDescription,
              requiredSpecializations: target.jobRequiredSpecializations,
              preferredSpecializations: target.jobPreferredSpecializations,
              minimumExperience: target.jobMinimumExperience,
              preferredLocation: target.jobPreferredLocation,
              requiredBar: target.jobRequiredBar,
              requiredTechnicalDomains: target.jobRequiredTechnicalDomains,
            })
          } else if (target.status === 'failed') {
            clearInterval(pollingRef.current!)
            pollingRef.current = null
            setErrorMessage(target.errorMessage || 'Parsing failed')
            setStatus('error')
          }
        } catch {
          // Continue polling
        }
      }, 3000)
    },
    [notifyWithJobData]
  )

  function validateFile(file: File): string | null {
    const ext = file.name.toLowerCase().split('.').pop()
    if (ext !== 'pdf' && ext !== 'docx') {
      return 'Only PDF and DOCX files are accepted'
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'File size exceeds 10MB limit'
    }
    return null
  }

  async function handleFile(file: File) {
    const validationError = validateFile(file)
    if (validationError) {
      setErrorMessage(validationError)
      setStatus('error')
      return
    }

    try {
      setStatus('uploading')
      setErrorMessage(null)
      setFilename(file.name)

      // Step 1: Get signed upload URL
      const signedRes = await fetch('/api/employer/jobs/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name }),
      })
      if (!signedRes.ok) throw new Error('Failed to get upload URL')
      const { signedUrl, path } = await signedRes.json()

      // Step 2: Upload directly to Supabase Storage
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!uploadRes.ok) throw new Error('Upload to storage failed')

      // Step 3: Create DB record
      const putRes = await fetch('/api/employer/jobs/upload', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, path }),
      })
      if (!putRes.ok) throw new Error('Failed to create upload record')
      const record: JobAdUploadRecord = await putRes.json()

      // Step 4: Trigger parse
      setStatus('parsing')
      const parseRes = await fetch('/api/employer/jobs/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobAdUploadId: record.id }),
      })
      const parseResult = await parseRes.json()

      if (!parseRes.ok) {
        throw new Error(parseResult.error || 'Failed to trigger parsing')
      }

      if (parseResult.success && parseResult.job) {
        notifyWithJobData(parseResult.job)
      } else if (parseResult.success && parseResult.jobId) {
        // Fallback: poll if job data wasn't included in response
        pollForCompletion(record.id)
      } else if (parseResult.error) {
        setErrorMessage(parseResult.error)
        setStatus('error')
      } else {
        // Parse is async, poll for completion
        pollForCompletion(record.id)
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed')
      setStatus('error')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function reset() {
    setStatus('idle')
    setErrorMessage(null)
    setFilename(null)
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  if (status === 'uploading') {
    return (
      <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-muted-foreground/25 p-10">
        <Loader2 className="mb-3 size-10 animate-spin text-primary" />
        <p className="text-sm font-medium">Uploading {filename}...</p>
        <p className="text-xs text-muted-foreground">This should only take a moment</p>
      </div>
    )
  }

  if (status === 'parsing') {
    return (
      <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-muted-foreground/25 p-10">
        <Loader2 className="mb-3 size-10 animate-spin text-primary" />
        <p className="text-sm font-medium">Analyzing job advertisement...</p>
        <p className="text-xs text-muted-foreground">
          Extracting job requirements, specializations, and qualifications
        </p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-red-200 bg-red-50 p-10 dark:border-red-900 dark:bg-red-950">
        <XCircle className="mb-3 size-10 text-red-500" />
        {filename && (
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="size-4" />
            <span>{filename}</span>
          </div>
        )}
        <p className="mb-4 max-w-md text-center text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
        <Button variant="outline" className="rounded-lg" onClick={reset}>
          Try Again
        </Button>
      </div>
    )
  }

  // idle state - dropzone
  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        setDragOver(false)
      }}
      className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors ${
        dragOver
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-muted-foreground/50'
      }`}
    >
      <Upload className="mb-3 size-10 text-muted-foreground" />
      <p className="mb-1 text-sm font-medium">Drag and drop your job ad here</p>
      <p className="mb-4 text-xs text-muted-foreground">PDF or DOCX, max 10MB</p>
      <Button
        variant="outline"
        size="sm"
        className="rounded-lg transition-all"
        onClick={() => fileInputRef.current?.click()}
      >
        Select file
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  )
}
