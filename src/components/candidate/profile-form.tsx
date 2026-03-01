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
} from 'lucide-react'
import {
  updateCandidateProfileField,
  updateCandidateEducation,
  updateCandidateWorkHistory,
  updateCandidateBarAdmission,
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
  specializations: { name: string }[]
  technicalDomains: { name: string }[]
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
  if (profile.specializations.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No specializations recorded. These are extracted from your CV.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {profile.specializations.map((spec) => (
        <Badge key={spec.name} variant="secondary">
          {spec.name}
        </Badge>
      ))}
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
  if (profile.technicalDomains.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No technical domains recorded. These are extracted from your CV.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {profile.technicalDomains.map((domain) => (
        <Badge key={domain.name} variant="secondary">
          {domain.name}
        </Badge>
      ))}
    </div>
  )
}

function BarAdmissionsSection({
  profile,
}: {
  profile: CandidateProfileFormData
}) {
  if (profile.barAdmissions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No bar admissions recorded.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {profile.barAdmissions.map((bar, index) => (
        <div key={bar.id}>
          {index > 0 && <Separator className="mb-4" />}
          <div className="mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {bar.jurisdiction || `Entry ${index + 1}`}
            </span>
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
