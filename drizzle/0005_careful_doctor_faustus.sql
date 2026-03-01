ALTER TABLE "profiles" ADD COLUMN "open_to_offers" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "linkedin_sub" varchar(100);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "linkedin_name" varchar(255);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "linkedin_email" varchar(255);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "linkedin_email_verified" boolean;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "linkedin_picture_url" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "linkedin_connected_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_linkedin_sub_idx" ON "profiles" USING btree ("linkedin_sub");