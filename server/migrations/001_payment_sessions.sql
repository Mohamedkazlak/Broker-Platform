-- payment_sessions — tracks every checkout session created against
-- payment.reachi.ai, for both existing-broker upgrades and draft (pre-account)
-- signups. Mirrors the shape of instapay_submissions: a nullable broker_id
-- for the "already have an account" case, and an encrypted
-- registration_payload for the "provision the account once payment clears"
-- case, joined by a claim token the client polls with.
--
-- Run this once in the Supabase SQL editor (Project → SQL Editor) before the
-- payment integration can be used — there is no migration runner wired into
-- this repo, so nothing applies this automatically.

create table if not exists payment_sessions (
  id uuid primary key default gen_random_uuid(),

  -- Our own idempotency key, sent to Reachi as `order_id`.
  order_id text not null unique,

  -- Reachi's session id, filled in once the session is created.
  session_id text,

  -- Set for an existing-broker upgrade/renewal; null for a draft signup.
  broker_id uuid references brokers(id) on delete cascade,

  package text not null,
  package_category text,
  amount numeric(12, 2) not null,
  currency text not null default 'EGP',

  -- pending | completed | failed | expired | refunded
  status text not null default 'pending',

  -- Encrypted { formData (with passwordEnc), package, packageCategory, domain,
  -- domainFields } — only present for draft signups. Cleared once consumed.
  registration_payload jsonb,

  -- Lets an anonymous draft-flow client poll status without a session.
  claim_token_hash text unique,

  transaction_id text,
  pay_url text,
  expires_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_sessions_broker_id_idx
  on payment_sessions (broker_id);

create index if not exists payment_sessions_status_idx
  on payment_sessions (status);

-- RLS: this table is only ever touched via supabaseAdmin (service role) from
-- the server, same as instapay_submissions — enable RLS with no policies so
-- it's inert for anon/authenticated roles by default.
alter table payment_sessions enable row level security;
