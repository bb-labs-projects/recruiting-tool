CREATE TABLE "mfa_recovery_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD COLUMN "corporate_domains" text[];--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD COLUMN "tob_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD COLUMN "tob_version" varchar(50);--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD COLUMN "corporate_email_domain" varchar(255);--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD COLUMN "is_freemail_domain" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD COLUMN "trade_licence_storage_path" text;--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD COLUMN "trade_licence_filename" varchar(255);--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD COLUMN "trade_licence_uploaded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "employer_profiles" ADD COLUMN "verification_notes" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "mfa_secret" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "mfa_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "mfa_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "mfa_recovery_codes" ADD CONSTRAINT "mfa_recovery_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mfa_recovery_codes_user_idx" ON "mfa_recovery_codes" USING btree ("user_id");