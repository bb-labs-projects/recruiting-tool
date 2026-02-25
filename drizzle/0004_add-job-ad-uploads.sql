CREATE TABLE "job_ad_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid,
	"filename" varchar(255) NOT NULL,
	"blob_url" text NOT NULL,
	"storage_path" text,
	"status" "cv_upload_status" DEFAULT 'uploaded' NOT NULL,
	"error_message" text,
	"parsed_at" timestamp with time zone,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_ad_uploads" ADD CONSTRAINT "job_ad_uploads_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_ad_uploads" ADD CONSTRAINT "job_ad_uploads_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_ad_uploads_status_idx" ON "job_ad_uploads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "job_ad_uploads_uploaded_by_idx" ON "job_ad_uploads" USING btree ("uploaded_by");