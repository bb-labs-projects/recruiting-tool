'use client'

import { useState, useRef, useTransition, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Pencil,
  User,
  GraduationCap,
  Briefcase,
  Scale,
  Cpu,
  Tags,
  X,
} from 'lucide-react'
import {
  updateCandidateProfileField,
  updateCandidateEducation,
  updateCandidateWorkHistory,
  updateCandidateBarAdmission,
  addCandidateSpecialization,
  removeCandidateSpecialization,
  addCandidateTechnicalDomain,
  removeCandidateTechnicalDomain,
  addCandidateBarAdmission,
  removeCandidateBarAdmission,
} from '@/actions/candidate-profiles'

// ---------------------------------------------------------------------------
// Types (no confidence fields)
// ---------------------------------------------------------------------------

interface EducationEntry {
  id: string
  institution: string
  degree: string
  field: string
  year: string | null
}

interface WorkHistoryEntry {
  id: string
  employer: string
  title: string
  startDate: string | null
  endDate: string | null
  description: string | null
}

interface BarAdmissionEntry {
  id: string
  jurisdiction: string
  year: string | null
  status: string | null
}

export interface CandidateProfileFormData {
  id: string
  name: string
  email: string | null
  phone: string | null
  education: EducationEntry[]
  workHistory: WorkHistoryEntry[]
  barAdmissions: BarAdmissionEntry[]
  specializations: { id: string; name: string }[]
  technicalDomains: { id: string; name: string }[]
}

// ---------------------------------------------------------------------------
// CandidateEditField (simplified InlineEditField without confidence)
// ---------------------------------------------------------------------------

interface CandidateEditFieldProps {
  value: string
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>
  label: string
}

function CandidateEditField({ value, action, label }: CandidateEditFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

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
        <Pencil className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Action wrappers
// ---------------------------------------------------------------------------

function createProfileFieldAction(profileId: string, fieldName: string) {
  return async (formData: FormData) => {
    const fd = new FormData()
    fd.set('profileId', profileId)
    fd.set('fieldName', fieldName)
    fd.set('value', formData.get('value') as string)
    return updateCandidateProfileField(fd)
  }
}

function createEducationAction(
  educationId: string,
  profileId: string,
  currentValues: {
    institution: string
    degree: string
    field: string
    year: string | null
  },
  editedField: string
) {
  return async (formData: FormData) => {
    const newValue = formData.get('value') as string
    const fd = new FormData()
    fd.set('educationId', educationId)
    fd.set('profileId', profileId)
    fd.set(
      'institution',
      editedField === 'institution' ? newValue : currentValues.institution
    )
    fd.set('degree', editedField === 'degree' ? newValue : currentValues.degree)
    fd.set('field', editedField === 'field' ? newValue : currentValues.field)
    fd.set(
      'year',
      editedField === 'year' ? newValue : (currentValues.year ?? '')
    )
    return updateCandidateEducation(fd)
  }
}

function createWorkHistoryAction(
  workHistoryId: string,
  profileId: string,
  currentValues: {
    employer: string
    title: string
    startDate: string | null
    endDate: string | null
    description: string | null
  },
  editedField: string
) {
  return async (formData: FormData) => {
    const newValue = formData.get('value') as string
    const fd = new FormData()
    fd.set('workHistoryId', workHistoryId)
    fd.set('profileId', profileId)
    fd.set(
      'employer',
      editedField === 'employer' ? newValue : currentValues.employer
    )
    fd.set('title', editedField === 'title' ? newValue : currentValues.title)
    fd.set(
      'startDate',
      editedField === 'startDate' ? newValue : (currentValues.startDate ?? '')
    )
    fd.set(
      'endDate',
      editedField === 'endDate' ? newValue : (currentValues.endDate ?? '')
    )
    fd.set(
      'description',
      editedField === 'description'
        ? newValue
        : (currentValues.description ?? '')
    )
    return updateCandidateWorkHistory(fd)
  }
}

function createBarAdmissionAction(
  barAdmissionId: string,
  profileId: string,
  currentValues: {
    jurisdiction: string
    year: string | null
    status: string | null
  },
  editedField: string
) {
  return async (formData: FormData) => {
    const newValue = formData.get('value') as string
    const fd = new FormData()
    fd.set('barAdmissionId', barAdmissionId)
    fd.set('profileId', profileId)
    fd.set(
      'jurisdiction',
      editedField === 'jurisdiction' ? newValue : currentValues.jurisdiction
    )
    fd.set(
      'year',
      editedField === 'year' ? newValue : (currentValues.year ?? '')
    )
    fd.set(
      'status',
      editedField === 'status' ? newValue : (currentValues.status ?? '')
    )
    return updateCandidateBarAdmission(fd)
  }
}

// ---------------------------------------------------------------------------
// Add/Remove helper components
// ---------------------------------------------------------------------------

function AddTagInput({
  profileId,
  action,
  placeholder,
}: {
  profileId: string
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>
  placeholder: string
}) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed) return

    startTransition(async () => {
      const formData = new FormData()
      formData.set('profileId', profileId)
      formData.set('name', trimmed)
      const result = await action(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setError(null)
        setValue('')
        inputRef.current?.focus()
      }
    })
  }

  return (
    <div className="mt-3 space-y-1">
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSubmit()
            }
          }}
          placeholder={placeholder}
          disabled={isPending}
          className="h-8 text-sm"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || !value.trim()}
          className="h-8 px-3 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
        >
          {isPending ? '...' : 'Add'}
        </button>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  )
}

function RemovableTag({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => Promise<{ error?: string; success?: boolean }>
}) {
  const [isPending, startTransition] = useTransition()

  function handleRemove() {
    startTransition(async () => {
      await onRemove()
    })
  }

  return (
    <Badge variant="secondary" className={`gap-1 pr-1 ${isPending ? 'opacity-50' : ''}`}>
      {label}
      <button
        type="button"
        onClick={handleRemove}
        disabled={isPending}
        className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
        aria-label={`Remove ${label}`}
      >
        <X className="size-3" />
      </button>
    </Badge>
  )
}

function RemoveBarAdmissionButton({
  barAdmissionId,
  profileId,
}: {
  barAdmissionId: string
  profileId: string
}) {
  const [isPending, startTransition] = useTransition()

  function handleRemove() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('barAdmissionId', barAdmissionId)
      fd.set('profileId', profileId)
      await removeCandidateBarAdmission(fd)
    })
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={isPending}
      className="text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
      aria-label="Remove bar admission"
    >
      {isPending ? '...' : 'Remove'}
    </button>
  )
}

function AddBarAdmissionForm({ profileId }: { profileId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [jurisdiction, setJurisdiction] = useState('')
  const [year, setYear] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-3 text-sm text-brand font-medium hover:underline"
      >
        + Add Bar Admission
      </button>
    )
  }

  function handleSubmit() {
    if (!jurisdiction.trim()) {
      setError('Jurisdiction is required')
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.set('profileId', profileId)
      formData.set('jurisdiction', jurisdiction.trim())
      formData.set('year', year.trim())
      formData.set('status', status.trim())
      const result = await addCandidateBarAdmission(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setError(null)
        setJurisdiction('')
        setYear('')
        setStatus('')
        setIsOpen(false)
      }
    })
  }

  return (
    <div className="mt-3 space-y-2 rounded-md border border-border p-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Input
          value={jurisdiction}
          onChange={(e) => { setJurisdiction(e.target.value); setError(null) }}
          placeholder="Jurisdiction"
          disabled={isPending}
          className="h-8 text-sm"
        />
        <Input
          value={year}
          onChange={(e) => setYear(e.target.value)}
          placeholder="Year"
          disabled={isPending}
          className="h-8 text-sm"
        />
        <Input
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          placeholder="Status (e.g., Active)"
          disabled={isPending}
          className="h-8 text-sm"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="h-7 px-3 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Adding...' : 'Add'}
        </button>
        <button
          type="button"
          onClick={() => { setIsOpen(false); setError(null) }}
          disabled={isPending}
          className="h-7 px-3 text-xs font-medium rounded-md text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------

const sections = [
  { id: 'contact', label: 'Contact', icon: User },
  { id: 'specializations', label: 'Specializations', icon: Tags },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'work', label: 'Work History', icon: Briefcase },
  { id: 'domains', label: 'Technical Domains', icon: Cpu },
  { id: 'bar', label: 'Bar Admissions', icon: Scale },
] as const

type SectionId = (typeof sections)[number]['id']

// ---------------------------------------------------------------------------
// Section content components
// ---------------------------------------------------------------------------

function ContactSection({ profile }: { profile: CandidateProfileFormData }) {
  return (
    <div className="space-y-4">
      <CandidateEditField
        value={profile.name}
        action={createProfileFieldAction(profile.id, 'name')}
        label="Full Name"
      />
      <CandidateEditField
        value={profile.email ?? ''}
        action={createProfileFieldAction(profile.id, 'email')}
        label="Email"
      />
      <CandidateEditField
        value={profile.phone ?? ''}
        action={createProfileFieldAction(profile.id, 'phone')}
        label="Phone"
      />
    </div>
  )
}

function SpecializationsSection({
  profile,
}: {
  profile: CandidateProfileFormData
}) {
  return (
    <div>
      {profile.specializations.length === 0 ? (
        <p className="text-muted-foreground text-sm mb-2">
          No specializations recorded.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {profile.specializations.map((spec) => (
            <RemovableTag
              key={spec.id}
              label={spec.name}
              onRemove={async () => {
                const fd = new FormData()
                fd.set('profileId', profile.id)
                fd.set('specializationId', spec.id)
                return removeCandidateSpecialization(fd)
              }}
            />
          ))}
        </div>
      )}
      <AddTagInput
        profileId={profile.id}
        action={addCandidateSpecialization}
        placeholder="Add a specialization..."
      />
    </div>
  )
}

function EducationSection({ profile }: { profile: CandidateProfileFormData }) {
  if (profile.education.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No education entries recorded.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {profile.education.map((edu, index) => (
        <div key={edu.id}>
          {index > 0 && <Separator className="mb-4" />}
          <div className="mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {edu.institution || `Entry ${index + 1}`}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CandidateEditField
              value={edu.institution}
              action={createEducationAction(
                edu.id,
                profile.id,
                edu,
                'institution'
              )}
              label="Institution"
            />
            <CandidateEditField
              value={edu.degree}
              action={createEducationAction(
                edu.id,
                profile.id,
                edu,
                'degree'
              )}
              label="Degree"
            />
            <CandidateEditField
              value={edu.field}
              action={createEducationAction(
                edu.id,
                profile.id,
                edu,
                'field'
              )}
              label="Field of Study"
            />
            <CandidateEditField
              value={edu.year ?? ''}
              action={createEducationAction(
                edu.id,
                profile.id,
                edu,
                'year'
              )}
              label="Year"
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function WorkHistorySection({
  profile,
}: {
  profile: CandidateProfileFormData
}) {
  const sorted = [...profile.workHistory].sort((a, b) => {
    const aDate = a.startDate ?? ''
    const bDate = b.startDate ?? ''
    return bDate.localeCompare(aDate)
  })

  if (sorted.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No work history recorded.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {sorted.map((work, index) => (
        <div key={work.id}>
          {index > 0 && <Separator className="mb-4" />}
          <div className="mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {work.employer || `Entry ${index + 1}`}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CandidateEditField
              value={work.employer}
              action={createWorkHistoryAction(
                work.id,
                profile.id,
                work,
                'employer'
              )}
              label="Employer"
            />
            <CandidateEditField
              value={work.title}
              action={createWorkHistoryAction(
                work.id,
                profile.id,
                work,
                'title'
              )}
              label="Title"
            />
            <CandidateEditField
              value={work.startDate ?? ''}
              action={createWorkHistoryAction(
                work.id,
                profile.id,
                work,
                'startDate'
              )}
              label="Start Date"
            />
            <CandidateEditField
              value={work.endDate ?? ''}
              action={createWorkHistoryAction(
                work.id,
                profile.id,
                work,
                'endDate'
              )}
              label="End Date"
            />
            <div className="sm:col-span-2">
              <CandidateEditField
                value={work.description ?? ''}
                action={createWorkHistoryAction(
                  work.id,
                  profile.id,
                  work,
                  'description'
                )}
                label="Description"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function TechnicalDomainsSection({
  profile,
}: {
  profile: CandidateProfileFormData
}) {
  return (
    <div>
      {profile.technicalDomains.length === 0 ? (
        <p className="text-muted-foreground text-sm mb-2">
          No technical domains recorded.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {profile.technicalDomains.map((domain) => (
            <RemovableTag
              key={domain.id}
              label={domain.name}
              onRemove={async () => {
                const fd = new FormData()
                fd.set('profileId', profile.id)
                fd.set('technicalDomainId', domain.id)
                return removeCandidateTechnicalDomain(fd)
              }}
            />
          ))}
        </div>
      )}
      <AddTagInput
        profileId={profile.id}
        action={addCandidateTechnicalDomain}
        placeholder="Add a technical domain..."
      />
    </div>
  )
}

function BarAdmissionsSection({
  profile,
}: {
  profile: CandidateProfileFormData
}) {
  return (
    <div>
      {profile.barAdmissions.length === 0 ? (
        <p className="text-muted-foreground text-sm mb-2">
          No bar admissions recorded.
        </p>
      ) : (
        <div className="space-y-6">
          {profile.barAdmissions.map((bar, index) => (
            <div key={bar.id}>
              {index > 0 && <Separator className="mb-4" />}
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {bar.jurisdiction || `Entry ${index + 1}`}
                </span>
                <RemoveBarAdmissionButton
                  barAdmissionId={bar.id}
                  profileId={profile.id}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <CandidateEditField
                  value={bar.jurisdiction}
                  action={createBarAdmissionAction(
                    bar.id,
                    profile.id,
                    bar,
                    'jurisdiction'
                  )}
                  label="Jurisdiction"
                />
                <CandidateEditField
                  value={bar.year ?? ''}
                  action={createBarAdmissionAction(
                    bar.id,
                    profile.id,
                    bar,
                    'year'
                  )}
                  label="Year"
                />
                <CandidateEditField
                  value={bar.status ?? ''}
                  action={createBarAdmissionAction(
                    bar.id,
                    profile.id,
                    bar,
                    'status'
                  )}
                  label="Status"
                />
              </div>
            </div>
          ))}
        </div>
      )}
      <AddBarAdmissionForm profileId={profile.id} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// CandidateProfileForm Component -- two-panel layout
// ---------------------------------------------------------------------------

export function CandidateProfileForm({
  profile,
}: {
  profile: CandidateProfileFormData
}) {
  const [activeSection, setActiveSection] = useState<SectionId>('contact')

  const sectionContent: Record<SectionId, React.ReactNode> = {
    contact: <ContactSection profile={profile} />,
    specializations: <SpecializationsSection profile={profile} />,
    education: <EducationSection profile={profile} />,
    work: <WorkHistorySection profile={profile} />,
    domains: <TechnicalDomainsSection profile={profile} />,
    bar: <BarAdmissionsSection profile={profile} />,
  }

  const sectionTitles: Record<SectionId, string> = {
    contact: 'Contact Information',
    specializations: 'Specializations',
    education: 'Education',
    work: 'Work History',
    domains: 'Technical Domains',
    bar: 'Bar Admissions',
  }

  // Count items for badges
  const counts: Partial<Record<SectionId, number>> = {
    education: profile.education.length,
    work: profile.workHistory.length,
    bar: profile.barAdmissions.length,
    specializations: profile.specializations.length,
    domains: profile.technicalDomains.length,
  }

  return (
    <div className="flex gap-6 min-h-[420px]">
      {/* Left nav */}
      <nav className="w-48 shrink-0">
        <div className="sticky top-20 space-y-0.5">
          {sections.map((section) => {
            const Icon = section.icon
            const isActive = activeSection === section.id
            const count = counts[section.id]

            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1">{section.label}</span>
                {count !== undefined && count > 0 && (
                  <span
                    className={`text-[10px] tabular-nums ${
                      isActive ? 'text-primary/70' : 'text-muted-foreground/60'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Right content */}
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-semibold mb-4">
          {sectionTitles[activeSection]}
        </h2>
        {sectionContent[activeSection]}
      </div>
    </div>
  )
}
