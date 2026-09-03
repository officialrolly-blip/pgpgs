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
ALTER TABLE "member_credentials" ADD CONSTRAINT "member_credentials_member_pk_pgpmembers_id_fk" FOREIGN KEY ("member_pk") REFERENCES "public"."pgpmembers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "member_sessions" ADD CONSTRAINT "member_sessions_credential_id_member_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."member_credentials"("id") ON DELETE cascade ON UPDATE no action;
