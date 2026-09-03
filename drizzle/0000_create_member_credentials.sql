CREATE TABLE "admin_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chapter_name" text NOT NULL,
	"chapter_address" text NOT NULL,
	"chapter_organizer" text NOT NULL,
	"logo_url" text,
	"president_id" uuid,
	"vice_president_id" uuid,
	"vice_president_role" text,
	"secretary_id" uuid,
	"treasurer_id" uuid,
	"master_initiator_id" uuid,
	"master_initiator_role" text,
	"lady_initiator_id" uuid,
	"lady_initiator_role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"published_at" timestamp with time zone,
	"published_by" text,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chapters_chapter_name_unique" UNIQUE("chapter_name")
);
--> statement-breakpoint
CREATE TABLE "member_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_pk" uuid NOT NULL,
	"member_id" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_credentials_member_id_unique" UNIQUE("member_id")
);
--> statement-breakpoint
CREATE TABLE "member_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"credential_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "pgpmembers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"middle_initial" text,
	"age" integer NOT NULL,
	"date_of_birth" text NOT NULL,
	"place_of_birth" text NOT NULL,
	"street" text NOT NULL,
	"barangay" text NOT NULL,
	"municipality" text NOT NULL,
	"province" text NOT NULL,
	"email" text NOT NULL,
	"contact_number" text NOT NULL,
	"guardian_name" text NOT NULL,
	"guardian_address" text NOT NULL,
	"guardian_contact" text NOT NULL,
	"baptized_name" text NOT NULL,
	"date_survived" text NOT NULL,
	"status" text NOT NULL,
	"member_chapter" text,
	"officer_position" text,
	"officer_date_elected" text,
	"former_president_chapter" text,
	"former_president_start" text,
	"former_president_end" text,
	"former_master_initiator_start" text,
	"former_master_initiator_end" text,
	"former_lady_initiator_start" text,
	"former_lady_initiator_end" text,
	"former_vice_president_chapter" text,
	"former_vice_president_role" text,
	"former_vice_president_start" text,
	"former_vice_president_end" text,
	"former_master_initiator_role" text,
	"former_master_initiator_chapter" text,
	"former_lady_initiator_role" text,
	"former_lady_initiator_chapter" text,
	"grand_knight" text,
	"grand_knight_chapter" text,
	"grand_knight_start" text,
	"grand_knight_end" text,
	"chapter_organizer_chapter" text,
	"photo_url" text,
	"has_photo" boolean DEFAULT false NOT NULL,
	"neophyte_status" text,
	"neophyte_status_updated_at" timestamp with time zone,
	"neophyte_status_updated_by" text,
	"neophyte_certification_issued_at" timestamp with time zone,
	"neophyte_certification_issued_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pgpmembers_member_id_unique" UNIQUE("member_id")
);
--> statement-breakpoint
CREATE TABLE "registration_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registration_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"middle_initial" text,
	"age" integer NOT NULL,
	"gender" text NOT NULL,
	"date_of_birth" text NOT NULL,
	"place_of_birth" text NOT NULL,
	"street" text NOT NULL,
	"barangay" text NOT NULL,
	"municipality" text NOT NULL,
	"province" text NOT NULL,
	"guardian_name" text NOT NULL,
	"guardian_address" text NOT NULL,
	"guardian_contact" text NOT NULL,
	"guardian_relationship" text NOT NULL,
	"studying" text NOT NULL,
	"school_name" text NOT NULL,
	"school_address" text,
	"school_year" text,
	"educational_attainment" text,
	"email" text NOT NULL,
	"contact_number" text NOT NULL,
	"password_hash" text NOT NULL,
	"application_status" text DEFAULT 'pending' NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registrations_member_id_unique" UNIQUE("member_id"),
	CONSTRAINT "registrations_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_president_id_pgpmembers_id_fk" FOREIGN KEY ("president_id") REFERENCES "public"."pgpmembers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_vice_president_id_pgpmembers_id_fk" FOREIGN KEY ("vice_president_id") REFERENCES "public"."pgpmembers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_secretary_id_pgpmembers_id_fk" FOREIGN KEY ("secretary_id") REFERENCES "public"."pgpmembers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_treasurer_id_pgpmembers_id_fk" FOREIGN KEY ("treasurer_id") REFERENCES "public"."pgpmembers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_master_initiator_id_pgpmembers_id_fk" FOREIGN KEY ("master_initiator_id") REFERENCES "public"."pgpmembers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_lady_initiator_id_pgpmembers_id_fk" FOREIGN KEY ("lady_initiator_id") REFERENCES "public"."pgpmembers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_credentials" ADD CONSTRAINT "member_credentials_member_pk_pgpmembers_id_fk" FOREIGN KEY ("member_pk") REFERENCES "public"."pgpmembers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_sessions" ADD CONSTRAINT "member_sessions_credential_id_member_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."member_credentials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_sessions" ADD CONSTRAINT "registration_sessions_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;