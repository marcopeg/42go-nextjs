-- No need to create public schema as it's the default in PostgreSQL

CREATE TABLE IF NOT EXISTS "feedback" (
    "id" text NOT NULL,
    "email" text NOT NULL,
    "message" text NOT NULL,
    "ip_address" text,
    "user_agent" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
); 