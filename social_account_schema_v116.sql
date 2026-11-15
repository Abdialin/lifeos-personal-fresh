-- LifeOS V116 social/account PostgreSQL schema proposal.
-- NOT automatically applied or referenced by server.py.
-- Apply only to dedicated database after security review and data migration plan.
-- Does not modify lifeos.state or lifeos.personal_preferences.
BEGIN;
CREATE SCHEMA IF NOT EXISTS lifeos_social;
CREATE TABLE IF NOT EXISTS lifeos_social.users (
 id text PRIMARY KEY, username text NOT NULL UNIQUE,
 salt text NOT NULL, password_hash text NOT NULL);
CREATE TABLE IF NOT EXISTS lifeos_social.sessions (
 token_hash text PRIMARY KEY,
 user_id text NOT NULL REFERENCES lifeos_social.users(id) ON DELETE CASCADE,
 expires bigint NOT NULL);
CREATE INDEX IF NOT EXISTS social_sessions_expiry ON lifeos_social.sessions(expires);
CREATE TABLE IF NOT EXISTS lifeos_social.invitations (
 id text PRIMARY KEY,
 sender text NOT NULL REFERENCES lifeos_social.users(id),
 recipient text NOT NULL REFERENCES lifeos_social.users(id),
 status text NOT NULL CHECK(status IN ('pending','accepted','declined','cancelled')),
 created bigint NOT NULL,
 UNIQUE(sender,recipient),
 CHECK(sender<>recipient));
CREATE TABLE IF NOT EXISTS lifeos_social.grants (
 owner text NOT NULL REFERENCES lifeos_social.users(id) ON DELETE CASCADE,
 viewer text NOT NULL REFERENCES lifeos_social.users(id) ON DELETE CASCADE,
 metric text NOT NULL CHECK(metric IN ('workoutDays','habitDays')),
 enabled boolean NOT NULL DEFAULT false,
 PRIMARY KEY(owner,viewer,metric));
CREATE TABLE IF NOT EXISTS lifeos_social.cards (
 owner text NOT NULL REFERENCES lifeos_social.users(id) ON DELETE CASCADE,
 metric text NOT NULL CHECK(metric IN ('workoutDays','habitDays')),
 days integer NOT NULL CHECK(days IN (7,14,30)),
 period_end date NOT NULL,
 score integer NOT NULL CHECK(score>=0),
 expires bigint NOT NULL,
 PRIMARY KEY(owner,metric,days,period_end),
 CHECK(score<=days));
CREATE TABLE IF NOT EXISTS lifeos_social.account_workspaces (
 owner text PRIMARY KEY REFERENCES lifeos_social.users(id) ON DELETE CASCADE,
 revision bigint NOT NULL CHECK(revision>=1),
 payload jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now());
COMMIT;
