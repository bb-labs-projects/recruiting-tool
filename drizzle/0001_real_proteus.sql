CREATE TYPE "public"."confidence_level" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."cv_upload_status" AS ENUM('uploaded', 'parsing', 'parsed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."employer_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('draft', 'open', 'closed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."matching_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."profile_status" AS ENUM('pending_review', 'active', 'rejected');--> statement-breakpoint
CREATE TABLE "bar_admissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"jurisdiction" varchar(255) NOT NULL,
	"year" varchar(10),
	"status" varchar(100),
	"confidence" "confidence_level" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cv_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" varchar(255) NOT NULL,
	"blob_url" text NOT NULL,
	"storage_path" text,
	"status" "cv_upload_status" DEFAULT 'uploaded' NOT NULL,
	"error_message" text,
	"uploaded_by" uuid NOT NULL,
	"profile_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"parsed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "education" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"institution" varchar(255) NOT NULL,
	"degree" varchar(255) NOT NULL,
	"field" varchar(255) NOT NULL,
	"year" varchar(10),
	"confidence" "confidence_level" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employer_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"company_website" varchar(500),
	"contact_name" varchar(255) NOT NULL,
	"contact_title" varchar(255),
	"phone" varchar(50),
	"status" "employer_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employer_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "job_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"overall_score" integer NOT NULL,
	"subscores" text NOT NULL,
	"summary" text NOT NULL,
	"recommendation" varchar(50) NOT NULL,
	"scored_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employer_user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" "job_status" DEFAULT 'draft' NOT NULL,
	"matching_status" "matching_status" DEFAULT 'pending' NOT NULL,
	"required_specializations" text[],
	"preferred_specializations" text[],
	"minimum_experience" integer,
	"preferred_location" varchar(255),
	"required_bar" text[],
	"required_technical_domains" text[],
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"matched_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "profile_specializations" (
	"profile_id" uuid NOT NULL,
	"specialization_id" uuid NOT NULL,
	"confidence" "confidence_level" NOT NULL,
	CONSTRAINT "profile_specializations_profile_id_specialization_id_pk" PRIMARY KEY("profile_id","specialization_id")
);
--> statement-breakpoint
CREATE TABLE "profile_technical_domains" (
	"profile_id" uuid NOT NULL,
	"technical_domain_id" uuid NOT NULL,
	"confidence" "confidence_level" NOT NULL,
	CONSTRAINT "profile_technical_domains_profile_id_technical_domain_id_pk" PRIMARY KEY("profile_id","technical_domain_id")
);
--> statement-breakpoint
CREATE TABLE "profile_unlocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employer_user_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"stripe_session_id" varchar(255) NOT NULL,
	"amount_paid" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'usd' NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employer_user_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" varchar(255) NOT NULL,
	"name_confidence" "confidence_level" NOT NULL,
	"email" varchar(255),
	"email_confidence" "confidence_level" NOT NULL,
	"phone" varchar(50),
	"phone_confidence" "confidence_level" NOT NULL,
	"status" "profile_status" DEFAULT 'pending_review' NOT NULL,
	"rejection_notes" text,
	"duplicate_notes" text,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_profiles" (
	"employer_user_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_profiles_employer_user_id_profile_id_pk" PRIMARY KEY("employer_user_id","profile_id")
);
--> statement-breakpoint
CREATE TABLE "specializations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	CONSTRAINT "specializations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_event_id" varchar(255) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_events_stripe_event_id_unique" UNIQUE("stripe_event_id")
);
--> statement-breakpoint
CREATE TABLE "technical_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	CONSTRAINT "technical_domains_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "work_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"employer" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"start_date" varchar(20),
	"end_date" varchar(20),
	"description" text,
	"confidence" "confidence_level" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bar_admissions" ADD CONSTRAINT "bar_admissions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_uploads" ADD CONSTRAINT "cv_uploads_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_uploads" ADD CONSTRAINT "cv_uploads_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "education" ADD CONSTRAINT "education_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD CONSTRAINT "employer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD CONSTRAINT "employer_profiles_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_matches" ADD CONSTRAINT "job_matches_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_employer_user_id_users_id_fk" FOREIGN KEY ("employer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_specializations" ADD CONSTRAINT "profile_specializations_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_specializations" ADD CONSTRAINT "profile_specializations_specialization_id_specializations_id_fk" FOREIGN KEY ("specialization_id") REFERENCES "public"."specializations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_technical_domains" ADD CONSTRAINT "profile_technical_domains_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_technical_domains" ADD CONSTRAINT "profile_technical_domains_technical_domain_id_technical_domains_id_fk" FOREIGN KEY ("technical_domain_id") REFERENCES "public"."technical_domains"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_unlocks" ADD CONSTRAINT "profile_unlocks_employer_user_id_users_id_fk" FOREIGN KEY ("employer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_unlocks" ADD CONSTRAINT "profile_unlocks_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_employer_user_id_users_id_fk" FOREIGN KEY ("employer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_views" ADD CONSTRAINT "profile_views_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_profiles" ADD CONSTRAINT "saved_profiles_employer_user_id_users_id_fk" FOREIGN KEY ("employer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_profiles" ADD CONSTRAINT "saved_profiles_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_history" ADD CONSTRAINT "work_history_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bar_admissions_profile_idx" ON "bar_admissions" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "cv_uploads_status_idx" ON "cv_uploads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cv_uploads_uploaded_by_idx" ON "cv_uploads" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "education_profile_idx" ON "education" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "employer_profiles_user_idx" ON "employer_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "employer_profiles_status_idx" ON "employer_profiles" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "job_matches_job_profile_idx" ON "job_matches" USING btree ("job_id","profile_id");--> statement-breakpoint
CREATE INDEX "job_matches_job_idx" ON "job_matches" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "job_matches_profile_idx" ON "job_matches" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "job_matches_score_idx" ON "job_matches" USING btree ("job_id","overall_score");--> statement-breakpoint
CREATE INDEX "jobs_employer_idx" ON "jobs" USING btree ("employer_user_id");--> statement-breakpoint
CREATE INDEX "jobs_status_idx" ON "jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "profile_specializations_profile_idx" ON "profile_specializations" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "profile_specializations_spec_idx" ON "profile_specializations" USING btree ("specialization_id");--> statement-breakpoint
CREATE INDEX "profile_technical_domains_profile_idx" ON "profile_technical_domains" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "profile_technical_domains_domain_idx" ON "profile_technical_domains" USING btree ("technical_domain_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_unlocks_employer_profile_idx" ON "profile_unlocks" USING btree ("employer_user_id","profile_id");--> statement-breakpoint
CREATE INDEX "profile_unlocks_employer_idx" ON "profile_unlocks" USING btree ("employer_user_id");--> statement-breakpoint
CREATE INDEX "profile_unlocks_profile_idx" ON "profile_unlocks" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "profile_views_profile_idx" ON "profile_views" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "profile_views_employer_idx" ON "profile_views" USING btree ("employer_user_id");--> statement-breakpoint
CREATE INDEX "profile_views_viewed_at_idx" ON "profile_views" USING btree ("viewed_at");--> statement-breakpoint
CREATE INDEX "profiles_status_idx" ON "profiles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "profiles_user_id_idx" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "saved_profiles_employer_idx" ON "saved_profiles" USING btree ("employer_user_id");--> statement-breakpoint
CREATE INDEX "saved_profiles_profile_idx" ON "saved_profiles" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stripe_events_event_id_idx" ON "stripe_events" USING btree ("stripe_event_id");--> statement-breakpoint
CREATE INDEX "work_history_profile_idx" ON "work_history" USING btree ("profile_id");