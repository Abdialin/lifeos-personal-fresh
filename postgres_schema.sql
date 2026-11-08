-- Apply to a dedicated LifeOS PostgreSQL database before enabling LIFEOS_DATABASE_URL.
-- Creates the schema/table required by server.py; does not touch other schemas.
BEGIN;
CREATE SCHEMA IF NOT EXISTS lifeos;
CREATE TABLE IF NOT EXISTS lifeos.state (
    id integer PRIMARY KEY CHECK (id = 1),
    revision bigint NOT NULL CHECK (revision >= 1),
    payload jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;

-- Stage 32: append-only calendar audit; apply explicitly before using PostgreSQL audit endpoints.
CREATE TABLE IF NOT EXISTS lifeos.calendar_audit (
 sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id text UNIQUE NOT NULL,
 entry jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
