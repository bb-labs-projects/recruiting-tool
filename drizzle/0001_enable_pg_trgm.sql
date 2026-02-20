-- Custom migration: enable pg_trgm and create GIN indexes for search
-- Run manually: psql $DATABASE_URL -f drizzle/0001_enable_pg_trgm.sql

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN indexes for ILIKE search acceleration on non-PII text fields
CREATE INDEX IF NOT EXISTS idx_specializations_name_trgm
  ON specializations USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_technical_domains_name_trgm
  ON technical_domains USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_bar_admissions_jurisdiction_trgm
  ON bar_admissions USING GIN (jurisdiction gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_education_institution_trgm
  ON education USING GIN (institution gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_education_field_trgm
  ON education USING GIN (field gin_trgm_ops);
