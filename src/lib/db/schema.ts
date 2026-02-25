import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  boolean,
  timestamp,
  text,
  integer,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core'

// Role enum
export const userRoleEnum = pgEnum('user_role', ['candidate', 'employer', 'admin'])

// Job status enum
export const jobStatusEnum = pgEnum('job_status', ['draft', 'open', 'closed', 'archived'])

// Matching status enum
export const matchingStatusEnum = pgEnum('matching_status', ['pending', 'running', 'completed', 'failed'])

// Users table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  role: userRoleEnum('role').notNull().default('candidate'),
  emailVerified: boolean('email_verified').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  mfaSecret: text('mfa_secret'),
  mfaEnabled: boolean('mfa_enabled').default(false).notNull(),
  mfaVerifiedAt: timestamp('mfa_verified_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('users_email_idx').on(table.email),
])

// Magic link tokens
export const magicLinkTokens = pgTable('magic_link_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).unique().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  redirectPath: text('redirect_path').default('/'),
}, (table) => [
  index('magic_link_tokens_hash_idx').on(table.tokenHash),
  index('magic_link_tokens_expires_idx').on(table.expiresAt),
  index('magic_link_tokens_user_idx').on(table.userId),
])

// Sessions table
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).unique().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }).defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
}, (table) => [
  index('sessions_token_idx').on(table.tokenHash),
  index('sessions_user_idx').on(table.userId),
])

// CV upload status enum
export const cvUploadStatusEnum = pgEnum('cv_upload_status', [
  'uploaded', 'parsing', 'parsed', 'failed',
])

// Confidence level enum
export const confidenceEnum = pgEnum('confidence_level', [
  'high', 'medium', 'low',
])

// Profile status enum
export const profileStatusEnum = pgEnum('profile_status', [
  'pending_review', 'active', 'rejected',
])

// Profiles table
export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  nameConfidence: confidenceEnum('name_confidence').notNull(),
  email: varchar('email', { length: 255 }),
  emailConfidence: confidenceEnum('email_confidence').notNull(),
  phone: varchar('phone', { length: 50 }),
  phoneConfidence: confidenceEnum('phone_confidence').notNull(),
  status: profileStatusEnum('status').notNull().default('pending_review'),
  rejectionNotes: text('rejection_notes'),
  duplicateNotes: text('duplicate_notes'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('profiles_status_idx').on(table.status),
  index('profiles_user_id_idx').on(table.userId),
])

// CV uploads table
export const cvUploads = pgTable('cv_uploads', {
  id: uuid('id').defaultRandom().primaryKey(),
  filename: varchar('filename', { length: 255 }).notNull(),
  blobUrl: text('blob_url').notNull(),
  storagePath: text('storage_path'),
  status: cvUploadStatusEnum('status').notNull().default('uploaded'),
  errorMessage: text('error_message'),
  uploadedBy: uuid('uploaded_by').notNull().references(() => users.id),
  profileId: uuid('profile_id').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  parsedAt: timestamp('parsed_at', { withTimezone: true }),
}, (table) => [
  index('cv_uploads_status_idx').on(table.status),
  index('cv_uploads_uploaded_by_idx').on(table.uploadedBy),
])

// Specializations lookup table
export const specializations = pgTable('specializations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).unique().notNull(),
})

// Profile specializations junction table
export const profileSpecializations = pgTable('profile_specializations', {
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  specializationId: uuid('specialization_id').notNull().references(() => specializations.id),
  confidence: confidenceEnum('confidence').notNull(),
}, (table) => [
  primaryKey({ columns: [table.profileId, table.specializationId] }),
  index('profile_specializations_profile_idx').on(table.profileId),
  index('profile_specializations_spec_idx').on(table.specializationId),
])

// Education table
export const education = pgTable('education', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  institution: varchar('institution', { length: 255 }).notNull(),
  degree: varchar('degree', { length: 255 }).notNull(),
  field: varchar('field', { length: 255 }).notNull(),
  year: varchar('year', { length: 10 }),
  confidence: confidenceEnum('confidence').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
}, (table) => [
  index('education_profile_idx').on(table.profileId),
])

// Technical domains lookup table
export const technicalDomains = pgTable('technical_domains', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).unique().notNull(),
})

// Profile technical domains junction table
export const profileTechnicalDomains = pgTable('profile_technical_domains', {
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  technicalDomainId: uuid('technical_domain_id').notNull().references(() => technicalDomains.id),
  confidence: confidenceEnum('confidence').notNull(),
}, (table) => [
  primaryKey({ columns: [table.profileId, table.technicalDomainId] }),
  index('profile_technical_domains_profile_idx').on(table.profileId),
  index('profile_technical_domains_domain_idx').on(table.technicalDomainId),
])

// Bar admissions table
export const barAdmissions = pgTable('bar_admissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  jurisdiction: varchar('jurisdiction', { length: 255 }).notNull(),
  year: varchar('year', { length: 10 }),
  status: varchar('status', { length: 100 }),
  confidence: confidenceEnum('confidence').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
}, (table) => [
  index('bar_admissions_profile_idx').on(table.profileId),
])

// Work history table
export const workHistory = pgTable('work_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  employer: varchar('employer', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  startDate: varchar('start_date', { length: 20 }),
  endDate: varchar('end_date', { length: 20 }),
  description: text('description'),
  confidence: confidenceEnum('confidence').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
}, (table) => [
  index('work_history_profile_idx').on(table.profileId),
])

// Languages table
export const languages = pgTable('languages', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  language: varchar('language', { length: 255 }).notNull(),
  proficiency: varchar('proficiency', { length: 100 }),
  confidence: confidenceEnum('confidence').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
}, (table) => [
  index('languages_profile_idx').on(table.profileId),
])

// Employer status enum
export const employerStatusEnum = pgEnum('employer_status', [
  'pending', 'approved', 'rejected',
])

// Employer profiles table
export const employerProfiles = pgTable('employer_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  companyWebsite: varchar('company_website', { length: 500 }),
  contactName: varchar('contact_name', { length: 255 }).notNull(),
  contactTitle: varchar('contact_title', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  status: employerStatusEnum('status').notNull().default('pending'),
  rejectionReason: text('rejection_reason'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  // Domain-based candidate suppression
  corporateDomains: text('corporate_domains').array(),
  // Terms of Business acceptance
  tobAcceptedAt: timestamp('tob_accepted_at', { withTimezone: true }),
  tobVersion: varchar('tob_version', { length: 50 }),
  // Enhanced employer verification
  corporateEmailDomain: varchar('corporate_email_domain', { length: 255 }),
  isFreemailDomain: boolean('is_freemail_domain').default(false).notNull(),
  // Trade licence upload
  tradeLicenceStoragePath: text('trade_licence_storage_path'),
  tradeLicenceFilename: varchar('trade_licence_filename', { length: 255 }),
  tradeLicenceUploadedAt: timestamp('trade_licence_uploaded_at', { withTimezone: true }),
  // Verification notes (admin)
  verificationNotes: text('verification_notes'),
}, (table) => [
  index('employer_profiles_user_idx').on(table.userId),
  index('employer_profiles_status_idx').on(table.status),
])

// Saved profiles junction table (employer bookmarks)
export const savedProfiles = pgTable('saved_profiles', {
  employerUserId: uuid('employer_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  savedAt: timestamp('saved_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.employerUserId, table.profileId] }),
  index('saved_profiles_employer_idx').on(table.employerUserId),
  index('saved_profiles_profile_idx').on(table.profileId),
])

// Stripe event deduplication table
export const stripeEvents = pgTable('stripe_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  stripeEventId: varchar('stripe_event_id', { length: 255 }).unique().notNull(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('stripe_events_event_id_idx').on(table.stripeEventId),
])

// Profile unlocks table (which employer unlocked which candidate)
export const profileUnlocks = pgTable('profile_unlocks', {
  id: uuid('id').defaultRandom().primaryKey(),
  employerUserId: uuid('employer_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  stripeSessionId: varchar('stripe_session_id', { length: 255 }).notNull(),
  amountPaid: integer('amount_paid').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('usd'),
  unlockedAt: timestamp('unlocked_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('profile_unlocks_employer_profile_idx').on(table.employerUserId, table.profileId),
  index('profile_unlocks_employer_idx').on(table.employerUserId),
  index('profile_unlocks_profile_idx').on(table.profileId),
])

// Profile views table (analytics tracking)
export const profileViews = pgTable('profile_views', {
  id: uuid('id').defaultRandom().primaryKey(),
  employerUserId: uuid('employer_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  viewedAt: timestamp('viewed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('profile_views_profile_idx').on(table.profileId),
  index('profile_views_employer_idx').on(table.employerUserId),
  index('profile_views_viewed_at_idx').on(table.viewedAt),
])

// Jobs table
export const jobs = pgTable('jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  employerUserId: uuid('employer_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: jobStatusEnum('status').notNull().default('draft'),
  matchingStatus: matchingStatusEnum('matching_status').notNull().default('pending'),
  requiredSpecializations: text('required_specializations').array(),
  preferredSpecializations: text('preferred_specializations').array(),
  minimumExperience: integer('minimum_experience'),
  preferredLocation: varchar('preferred_location', { length: 255 }),
  requiredBar: text('required_bar').array(),
  requiredTechnicalDomains: text('required_technical_domains').array(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  matchedAt: timestamp('matched_at', { withTimezone: true }),
}, (table) => [
  index('jobs_employer_idx').on(table.employerUserId),
  index('jobs_status_idx').on(table.status),
])

// MFA recovery codes table
export const mfaRecoveryCodes = pgTable('mfa_recovery_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  codeHash: varchar('code_hash', { length: 64 }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('mfa_recovery_codes_user_idx').on(table.userId),
])

// Job matches table (cached AI matching results)
export const jobMatches = pgTable('job_matches', {
  id: uuid('id').defaultRandom().primaryKey(),
  jobId: uuid('job_id')
    .notNull()
    .references(() => jobs.id, { onDelete: 'cascade' }),
  profileId: uuid('profile_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  overallScore: integer('overall_score').notNull(),
  subscores: text('subscores').notNull(),
  summary: text('summary').notNull(),
  recommendation: varchar('recommendation', { length: 50 }).notNull(),
  scoredAt: timestamp('scored_at', { withTimezone: true }).defaultNow().notNull(),
  notifiedAt: timestamp('notified_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('job_matches_job_profile_idx').on(table.jobId, table.profileId),
  index('job_matches_job_idx').on(table.jobId),
  index('job_matches_profile_idx').on(table.profileId),
  index('job_matches_score_idx').on(table.jobId, table.overallScore),
])
