'use client'

import { useState, useTransition, useCallback } from 'react'
import { InlineEditField } from './inline-edit-field'
import { ConfidenceBadge } from './confidence-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  updateProfileField,
  updateEducation,
  updateWorkHistory,
  updateBarAdmission,
  updateLanguage,
  reorderEntries,
  moveEntry,
} from '@/actions/profiles'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensors,
  useSensor,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { toast } from 'sonner'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EducationEntry {
  id: string
  institution: string
  degree: string
  field: string
  year: string | null
  confidence: 'high' | 'medium' | 'low'
  sortOrder: number
}

interface WorkHistoryEntry {
  id: string
  employer: string
  title: string
  startDate: string | null
  endDate: string | null
  description: string | null
  confidence: 'high' | 'medium' | 'low'
  sortOrder: number
}

interface BarAdmissionEntry {
  id: string
  jurisdiction: string
  year: string | null
  status: string | null
  confidence: 'high' | 'medium' | 'low'
  sortOrder: number
}

interface LanguageEntry {
  id: string
  language: string
  proficiency: string | null
  confidence: 'high' | 'medium' | 'low'
  sortOrder: number
}

interface SpecializationEntry {
  name: string
  confidence: 'high' | 'medium' | 'low'
}

interface TechnicalDomainEntry {
  name: string
  confidence: 'high' | 'medium' | 'low'
}

export interface ProfileFormData {
  id: string
  name: string
  nameConfidence: 'high' | 'medium' | 'low'
  email: string | null
  emailConfidence: 'high' | 'medium' | 'low'
  phone: string | null
  phoneConfidence: 'high' | 'medium' | 'low'
  education: EducationEntry[]
  workHistory: WorkHistoryEntry[]
  barAdmissions: BarAdmissionEntry[]
  languages: LanguageEntry[]
  specializations: SpecializationEntry[]
  technicalDomains: TechnicalDomainEntry[]
}

type Category = 'education' | 'workHistory' | 'barAdmissions' | 'languages'

// Unique DnD id: "category:entryId"
function dndId(category: Category, entryId: string) {
  return `${category}:${entryId}`
}

function parseDndId(id: string): { category: Category; entryId: string } {
  const idx = id.indexOf(':')
  return { category: id.slice(0, idx) as Category, entryId: id.slice(idx + 1) }
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
    return updateProfileField(fd)
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
    fd.set('institution', editedField === 'institution' ? newValue : currentValues.institution)
    fd.set('degree', editedField === 'degree' ? newValue : currentValues.degree)
    fd.set('field', editedField === 'field' ? newValue : currentValues.field)
    fd.set('year', editedField === 'year' ? newValue : (currentValues.year ?? ''))
    return updateEducation(fd)
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
    fd.set('employer', editedField === 'employer' ? newValue : currentValues.employer)
    fd.set('title', editedField === 'title' ? newValue : currentValues.title)
    fd.set('startDate', editedField === 'startDate' ? newValue : (currentValues.startDate ?? ''))
    fd.set('endDate', editedField === 'endDate' ? newValue : (currentValues.endDate ?? ''))
    fd.set('description', editedField === 'description' ? newValue : (currentValues.description ?? ''))
    return updateWorkHistory(fd)
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
    fd.set('jurisdiction', editedField === 'jurisdiction' ? newValue : currentValues.jurisdiction)
    fd.set('year', editedField === 'year' ? newValue : (currentValues.year ?? ''))
    fd.set('status', editedField === 'status' ? newValue : (currentValues.status ?? ''))
    return updateBarAdmission(fd)
  }
}

function createLanguageAction(
  languageId: string,
  profileId: string,
  currentValues: {
    language: string
    proficiency: string | null
  },
  editedField: string
) {
  return async (formData: FormData) => {
    const newValue = formData.get('value') as string
    const fd = new FormData()
    fd.set('languageId', languageId)
    fd.set('profileId', profileId)
    fd.set('language', editedField === 'language' ? newValue : currentValues.language)
    fd.set('proficiency', editedField === 'proficiency' ? newValue : (currentValues.proficiency ?? ''))
    return updateLanguage(fd)
  }
}

// ---------------------------------------------------------------------------
// Sortable entry wrapper
// ---------------------------------------------------------------------------

function SortableEntry({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group/drag">
      <div
        className="absolute left-0 top-3 -ml-6 cursor-grab opacity-0 group-hover/drag:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </div>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Droppable category wrapper
// ---------------------------------------------------------------------------

function DroppableCategory({
  category,
  items,
  isOver,
  children,
}: {
  category: Category
  items: string[]
  isOver: boolean
  children: React.ReactNode
}) {
  return (
    <SortableContext items={items} strategy={verticalListSortingStrategy}>
      <div
        data-category={category}
        className={`transition-colors rounded-lg ${
          isOver ? 'ring-2 ring-teal-400/60 bg-teal-50/30' : ''
        }`}
      >
        {children}
      </div>
    </SortableContext>
  )
}

// ---------------------------------------------------------------------------
// Label for a dragged entry
// ---------------------------------------------------------------------------

function getDragLabel(
  category: Category,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entry: any
): string {
  switch (category) {
    case 'education':
      return entry.institution
    case 'workHistory':
      return entry.employer
    case 'barAdmissions':
      return entry.jurisdiction
    case 'languages':
      return entry.language
    default:
      return ''
  }
}

// ---------------------------------------------------------------------------
// Sort helpers
// ---------------------------------------------------------------------------

function sortBySortOrder<T extends { sortOrder: number }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => a.sortOrder - b.sortOrder)
}

function sortEducationDesc(arr: EducationEntry[]): EducationEntry[] {
  return [...arr].sort((a, b) => {
    const aYear = a.year ?? ''
    const bYear = b.year ?? ''
    return bYear.localeCompare(aYear)
  })
}

function sortBarAdmissionsDesc(arr: BarAdmissionEntry[]): BarAdmissionEntry[] {
  return [...arr].sort((a, b) => {
    const aYear = a.year ?? ''
    const bYear = b.year ?? ''
    return bYear.localeCompare(aYear)
  })
}

function sortWorkHistoryDesc(arr: WorkHistoryEntry[]): WorkHistoryEntry[] {
  return [...arr].sort((a, b) => {
    const aDate = a.startDate ?? ''
    const bDate = b.startDate ?? ''
    return bDate.localeCompare(aDate)
  })
}

function sortLanguagesAlpha(arr: LanguageEntry[]): LanguageEntry[] {
  return [...arr].sort((a, b) => a.language.localeCompare(b.language))
}

// Check if any entries have non-zero sortOrder (meaning user has manually ordered them)
function hasCustomOrder<T extends { sortOrder: number }>(arr: T[]): boolean {
  return arr.some((entry, i) => entry.sortOrder !== 0 || (i > 0 && arr[i - 1].sortOrder !== 0))
}

function initialSort<T extends { sortOrder: number }>(
  arr: T[],
  defaultSort: (arr: T[]) => T[]
): T[] {
  // If user has custom sort order, use that; otherwise use default sort
  if (hasCustomOrder(arr)) {
    return sortBySortOrder(arr)
  }
  return defaultSort(arr)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProfileForm({ profile }: { profile: ProfileFormData }) {
  const [educationList, setEducationList] = useState(() =>
    initialSort(profile.education, sortEducationDesc)
  )
  const [workHistoryList, setWorkHistoryList] = useState(() =>
    initialSort(profile.workHistory, sortWorkHistoryDesc)
  )
  const [barAdmissionsList, setBarAdmissionsList] = useState(() =>
    initialSort(profile.barAdmissions, sortBarAdmissionsDesc)
  )
  const [languagesList, setLanguagesList] = useState(() =>
    initialSort(profile.languages, sortLanguagesAlpha)
  )
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overCategory, setOverCategory] = useState<Category | null>(null)
  const [isPending, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } })
  )

  type AnyEntry = EducationEntry | WorkHistoryEntry | BarAdmissionEntry | LanguageEntry

  function getList(category: Category): AnyEntry[] {
    switch (category) {
      case 'education': return educationList
      case 'workHistory': return workHistoryList
      case 'barAdmissions': return barAdmissionsList
      case 'languages': return languagesList
    }
  }

  function setList(category: Category, list: AnyEntry[]) {
    switch (category) {
      case 'education': setEducationList(list as EducationEntry[]); break
      case 'workHistory': setWorkHistoryList(list as WorkHistoryEntry[]); break
      case 'barAdmissions': setBarAdmissionsList(list as BarAdmissionEntry[]); break
      case 'languages': setLanguagesList(list as LanguageEntry[]); break
    }
  }

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event
    if (!over) {
      setOverCategory(null)
      return
    }
    const overId = over.id as string
    if (overId.includes(':')) {
      setOverCategory(parseDndId(overId).category)
    }
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setOverCategory(null)

    if (!over) return

    const activeInfo = parseDndId(active.id as string)
    const overInfo = parseDndId(over.id as string)

    if (activeInfo.category === overInfo.category) {
      // Same-category reorder
      const list = getList(activeInfo.category)
      const oldIndex = list.findIndex((e: { id: string }) => e.id === activeInfo.entryId)
      const newIndex = list.findIndex((e: { id: string }) => e.id === overInfo.entryId)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

      const newList = arrayMove(list, oldIndex, newIndex)
      const snapshot = getList(activeInfo.category)
      setList(activeInfo.category, newList)

      startTransition(async () => {
        const result = await reorderEntries({
          profileId: profile.id,
          category: activeInfo.category,
          orderedIds: newList.map((e: { id: string }) => e.id),
        })
        if (result.error) {
          toast.error(result.error)
          setList(activeInfo.category, snapshot)
        }
      })
    } else {
      // Cross-category move
      const sourceList = getList(activeInfo.category)
      const targetList = getList(overInfo.category)
      const sourceEntry = sourceList.find((e: { id: string }) => e.id === activeInfo.entryId)
      if (!sourceEntry) return

      const targetIndex = targetList.findIndex((e: { id: string }) => e.id === overInfo.entryId)
      const insertAt = targetIndex === -1 ? targetList.length : targetIndex

      // Snapshot for revert
      const sourceSnapshot = [...sourceList]
      const targetSnapshot = [...targetList]

      // Optimistic update: remove from source
      const newSource = sourceList.filter((e: { id: string }) => e.id !== activeInfo.entryId)
      setList(activeInfo.category, newSource)

      // Optimistic update: insert mapped entry in target
      const mappedEntry = mapEntryLocally(sourceEntry as unknown as Record<string, unknown>, activeInfo.category, overInfo.category) as unknown as AnyEntry
      const newTarget = [...targetList]
      newTarget.splice(insertAt, 0, mappedEntry)
      setList(overInfo.category, newTarget)

      startTransition(async () => {
        const result = await moveEntry({
          profileId: profile.id,
          sourceCategory: activeInfo.category,
          sourceId: activeInfo.entryId,
          targetCategory: overInfo.category,
          targetIndex: insertAt,
        })
        if (result.error) {
          toast.error(result.error)
          setList(activeInfo.category, sourceSnapshot)
          setList(overInfo.category, targetSnapshot)
        }
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [educationList, workHistoryList, barAdmissionsList, languagesList, profile.id])

  const activeDndItem = activeId ? (() => {
    const { category, entryId } = parseDndId(activeId)
    const list = getList(category)
    const entry = list.find((e: { id: string }) => e.id === entryId)
    if (!entry) return null
    return { category, entry }
  })() : null

  const educationDndIds = educationList.map(e => dndId('education', e.id))
  const workHistoryDndIds = workHistoryList.map(e => dndId('workHistory', e.id))
  const barAdmissionsDndIds = barAdmissionsList.map(e => dndId('barAdmissions', e.id))
  const languagesDndIds = languagesList.map(e => dndId('languages', e.id))

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={`space-y-6 ${isPending ? 'opacity-80 pointer-events-none' : ''}`}>
        {/* Section 1: Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InlineEditField
              profileId={profile.id}
              fieldName="name"
              value={profile.name}
              confidence={profile.nameConfidence}
              action={createProfileFieldAction(profile.id, 'name')}
              label="Name"
            />
            <InlineEditField
              profileId={profile.id}
              fieldName="email"
              value={profile.email ?? ''}
              confidence={profile.emailConfidence}
              action={createProfileFieldAction(profile.id, 'email')}
              label="Email"
            />
            <InlineEditField
              profileId={profile.id}
              fieldName="phone"
              value={profile.phone ?? ''}
              confidence={profile.phoneConfidence}
              action={createProfileFieldAction(profile.id, 'phone')}
              label="Phone"
            />
          </CardContent>
        </Card>

        {/* Section 2: Specializations (read-only) */}
        <Card>
          <CardHeader>
            <CardTitle>Specializations</CardTitle>
          </CardHeader>
          <CardContent>
            {profile.specializations.length === 0 ? (
              <p className="text-muted-foreground text-sm">No specializations recorded.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.specializations.map((spec) => (
                  <div key={spec.name} className="flex items-center gap-1">
                    <Badge variant="secondary">{spec.name}</Badge>
                    <ConfidenceBadge level={spec.confidence} className="text-[10px] px-1.5 py-0" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Education */}
        <Card>
          <CardHeader>
            <CardTitle>Education</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pl-10">
            <DroppableCategory
              category="education"
              items={educationDndIds}
              isOver={overCategory === 'education' && activeDndItem?.category !== 'education'}
            >
              {educationList.length === 0 ? (
                <p className="text-muted-foreground text-sm">No education entries recorded.</p>
              ) : (
                educationList.map((edu, index) => (
                  <SortableEntry key={edu.id} id={dndId('education', edu.id)}>
                    {index > 0 && <Separator className="mb-4" />}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-medium text-muted-foreground">
                        Entry {index + 1}
                      </span>
                      <ConfidenceBadge level={edu.confidence} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <InlineEditField
                        profileId={profile.id}
                        fieldName="institution"
                        value={edu.institution}
                        confidence={edu.confidence}
                        action={createEducationAction(edu.id, profile.id, edu, 'institution')}
                        label="Institution"
                      />
                      <InlineEditField
                        profileId={profile.id}
                        fieldName="degree"
                        value={edu.degree}
                        confidence={edu.confidence}
                        action={createEducationAction(edu.id, profile.id, edu, 'degree')}
                        label="Degree"
                      />
                      <InlineEditField
                        profileId={profile.id}
                        fieldName="field"
                        value={edu.field}
                        confidence={edu.confidence}
                        action={createEducationAction(edu.id, profile.id, edu, 'field')}
                        label="Field of Study"
                      />
                      <InlineEditField
                        profileId={profile.id}
                        fieldName="year"
                        value={edu.year ?? ''}
                        confidence={edu.confidence}
                        action={createEducationAction(edu.id, profile.id, edu, 'year')}
                        label="Year"
                      />
                    </div>
                  </SortableEntry>
                ))
              )}
            </DroppableCategory>
          </CardContent>
        </Card>

        {/* Section 4: Work History */}
        <Card>
          <CardHeader>
            <CardTitle>Work History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pl-10">
            <DroppableCategory
              category="workHistory"
              items={workHistoryDndIds}
              isOver={overCategory === 'workHistory' && activeDndItem?.category !== 'workHistory'}
            >
              {workHistoryList.length === 0 ? (
                <p className="text-muted-foreground text-sm">No work history recorded.</p>
              ) : (
                workHistoryList.map((work, index) => (
                  <SortableEntry key={work.id} id={dndId('workHistory', work.id)}>
                    {index > 0 && <Separator className="mb-4" />}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-medium text-muted-foreground">
                        Entry {index + 1}
                      </span>
                      <ConfidenceBadge level={work.confidence} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <InlineEditField
                        profileId={profile.id}
                        fieldName="employer"
                        value={work.employer}
                        confidence={work.confidence}
                        action={createWorkHistoryAction(work.id, profile.id, work, 'employer')}
                        label="Employer"
                      />
                      <InlineEditField
                        profileId={profile.id}
                        fieldName="title"
                        value={work.title}
                        confidence={work.confidence}
                        action={createWorkHistoryAction(work.id, profile.id, work, 'title')}
                        label="Title"
                      />
                      <InlineEditField
                        profileId={profile.id}
                        fieldName="startDate"
                        value={work.startDate ?? ''}
                        confidence={work.confidence}
                        action={createWorkHistoryAction(work.id, profile.id, work, 'startDate')}
                        label="Start Date"
                      />
                      <InlineEditField
                        profileId={profile.id}
                        fieldName="endDate"
                        value={work.endDate ?? ''}
                        confidence={work.confidence}
                        action={createWorkHistoryAction(work.id, profile.id, work, 'endDate')}
                        label="End Date"
                      />
                      <div className="sm:col-span-2">
                        <InlineEditField
                          profileId={profile.id}
                          fieldName="description"
                          value={work.description ?? ''}
                          confidence={work.confidence}
                          action={createWorkHistoryAction(work.id, profile.id, work, 'description')}
                          label="Description"
                        />
                      </div>
                    </div>
                  </SortableEntry>
                ))
              )}
            </DroppableCategory>
          </CardContent>
        </Card>

        {/* Section 5: Technical Domains (read-only) */}
        <Card>
          <CardHeader>
            <CardTitle>Technical Domains</CardTitle>
          </CardHeader>
          <CardContent>
            {profile.technicalDomains.length === 0 ? (
              <p className="text-muted-foreground text-sm">No technical domains recorded.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.technicalDomains.map((domain) => (
                  <div key={domain.name} className="flex items-center gap-1">
                    <Badge variant="secondary">{domain.name}</Badge>
                    <ConfidenceBadge level={domain.confidence} className="text-[10px] px-1.5 py-0" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 6: Languages */}
        <Card>
          <CardHeader>
            <CardTitle>Languages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pl-10">
            <DroppableCategory
              category="languages"
              items={languagesDndIds}
              isOver={overCategory === 'languages' && activeDndItem?.category !== 'languages'}
            >
              {languagesList.length === 0 ? (
                <p className="text-muted-foreground text-sm">No languages recorded.</p>
              ) : (
                languagesList.map((lang, index) => (
                  <SortableEntry key={lang.id} id={dndId('languages', lang.id)}>
                    {index > 0 && <Separator className="mb-4" />}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-medium text-muted-foreground">
                        Entry {index + 1}
                      </span>
                      <ConfidenceBadge level={lang.confidence} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <InlineEditField
                        profileId={profile.id}
                        fieldName="language"
                        value={lang.language}
                        confidence={lang.confidence}
                        action={createLanguageAction(lang.id, profile.id, lang, 'language')}
                        label="Language"
                      />
                      <InlineEditField
                        profileId={profile.id}
                        fieldName="proficiency"
                        value={lang.proficiency ?? ''}
                        confidence={lang.confidence}
                        action={createLanguageAction(lang.id, profile.id, lang, 'proficiency')}
                        label="Proficiency"
                      />
                    </div>
                  </SortableEntry>
                ))
              )}
            </DroppableCategory>
          </CardContent>
        </Card>

        {/* Section 7: Bar Admissions */}
        <Card>
          <CardHeader>
            <CardTitle>Bar Admissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pl-10">
            <DroppableCategory
              category="barAdmissions"
              items={barAdmissionsDndIds}
              isOver={overCategory === 'barAdmissions' && activeDndItem?.category !== 'barAdmissions'}
            >
              {barAdmissionsList.length === 0 ? (
                <p className="text-muted-foreground text-sm">No bar admissions recorded.</p>
              ) : (
                barAdmissionsList.map((bar, index) => (
                  <SortableEntry key={bar.id} id={dndId('barAdmissions', bar.id)}>
                    {index > 0 && <Separator className="mb-4" />}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-medium text-muted-foreground">
                        Entry {index + 1}
                      </span>
                      <ConfidenceBadge level={bar.confidence} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <InlineEditField
                        profileId={profile.id}
                        fieldName="jurisdiction"
                        value={bar.jurisdiction}
                        confidence={bar.confidence}
                        action={createBarAdmissionAction(bar.id, profile.id, bar, 'jurisdiction')}
                        label="Jurisdiction"
                      />
                      <InlineEditField
                        profileId={profile.id}
                        fieldName="year"
                        value={bar.year ?? ''}
                        confidence={bar.confidence}
                        action={createBarAdmissionAction(bar.id, profile.id, bar, 'year')}
                        label="Year"
                      />
                      <InlineEditField
                        profileId={profile.id}
                        fieldName="status"
                        value={bar.status ?? ''}
                        confidence={bar.confidence}
                        action={createBarAdmissionAction(bar.id, profile.id, bar, 'status')}
                        label="Status"
                      />
                    </div>
                  </SortableEntry>
                ))
              )}
            </DroppableCategory>
          </CardContent>
        </Card>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeDndItem ? (
          <div className="rounded-lg border bg-background p-3 shadow-lg opacity-80">
            <span className="text-sm font-medium">
              {getDragLabel(activeDndItem.category, activeDndItem.entry)}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

// ---------------------------------------------------------------------------
// Local field mapping for optimistic cross-category moves
// ---------------------------------------------------------------------------

function mapEntryLocally(
  source: Record<string, unknown>,
  from: Category,
  to: Category,
): Record<string, unknown> {
  const base = {
    id: `temp-${Date.now()}`,
    confidence: source.confidence || 'medium',
    sortOrder: 0,
  }

  if (to === 'education') {
    return {
      ...base,
      institution: from === 'workHistory' ? source.employer :
                   from === 'barAdmissions' ? source.jurisdiction :
                   from === 'languages' ? source.language : '',
      degree: from === 'workHistory' ? source.title : '',
      field: '',
      year: from === 'workHistory' ? (typeof source.startDate === 'string' ? source.startDate.slice(0, 4) : null) :
            from === 'barAdmissions' ? source.year : null,
    }
  }
  if (to === 'workHistory') {
    return {
      ...base,
      employer: from === 'education' ? source.institution :
                from === 'barAdmissions' ? source.jurisdiction :
                from === 'languages' ? source.language : '',
      title: from === 'education' ? [source.degree, source.field].filter(Boolean).join(' in ') : '',
      startDate: from === 'education' ? source.year :
                 from === 'barAdmissions' ? source.year : null,
      endDate: null,
      description: null,
    }
  }
  if (to === 'barAdmissions') {
    return {
      ...base,
      jurisdiction: from === 'education' ? source.institution :
                    from === 'workHistory' ? source.employer :
                    from === 'languages' ? source.language : '',
      year: from === 'education' ? source.year :
            from === 'workHistory' ? (typeof source.startDate === 'string' ? source.startDate.slice(0, 4) : null) : null,
      status: null,
    }
  }
  if (to === 'languages') {
    return {
      ...base,
      language: from === 'education' ? source.institution :
                from === 'workHistory' ? source.employer :
                from === 'barAdmissions' ? source.jurisdiction : '',
      proficiency: null,
    }
  }
  return base
}
