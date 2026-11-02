CREATE TABLE "users" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
  "token_hash" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "device_name" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "last_seen_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE SEQUENCE "records_seq";
--> statement-breakpoint
CREATE TABLE "records" (
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "table_name" text NOT NULL,
  "id" text NOT NULL,
  "payload" jsonb NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "deleted_at" timestamptz,
  "seq" bigint NOT NULL,
  PRIMARY KEY ("user_id", "table_name", "id")
);
--> statement-breakpoint
CREATE INDEX "records_user_seq" ON "records" ("user_id", "seq");
