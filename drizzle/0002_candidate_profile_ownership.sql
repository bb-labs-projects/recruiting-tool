-- Add userId and duplicateNotes columns to profiles (Drizzle push handles this)
-- This migration creates the partial unique index that Drizzle cannot express natively

CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_unique
  ON profiles(user_id)
  WHERE user_id IS NOT NULL;
