CREATE TABLE "file_reservations" (
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "key" text NOT NULL,
  "size" bigint NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id", "key")
);
