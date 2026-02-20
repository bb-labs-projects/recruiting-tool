-- Create jobs and job_matches tables for job posting and AI matching feature
-- Includes job_status and matching_status enums, plus indexes for common queries

-- Job status enum: draft -> open -> closed/archived
CREATE TYPE job_status AS ENUM ('draft', 'open', 'closed', 'archived');

-- Matching status enum: pending -> running -> completed/failed
CREATE TYPE matching_status AS ENUM ('pending', 'running', 'completed', 'failed');

-- Jobs table: employer job postings with matching requirements
CREATE TABLE jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status job_status NOT NULL DEFAULT 'draft',
  matching_status matching_status NOT NULL DEFAULT 'pending',
  required_specializations TEXT[],
  preferred_specializations TEXT[],
  minimum_experience INTEGER,
  preferred_location VARCHAR(255),
  required_bar TEXT[],
  required_technical_domains TEXT[],
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  matched_at TIMESTAMPTZ
);

CREATE INDEX jobs_employer_idx ON jobs(employer_user_id);
CREATE INDEX jobs_status_idx ON jobs(status);

-- Job matches table: cached AI matching results between jobs and candidate profiles
CREATE TABLE job_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL,
  subscores TEXT NOT NULL,
  summary TEXT NOT NULL,
  recommendation VARCHAR(50) NOT NULL,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX job_matches_job_profile_idx ON job_matches(job_id, profile_id);
CREATE INDEX job_matches_job_idx ON job_matches(job_id);
CREATE INDEX job_matches_profile_idx ON job_matches(profile_id);
CREATE INDEX job_matches_score_idx ON job_matches(job_id, overall_score);
