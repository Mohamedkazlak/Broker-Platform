-- Deferred Instapay registration: keep signup data on the submission until
-- an admin approves. Broker / auth / profile rows are created only then.

DROP INDEX IF EXISTS public.instapay_submissions_one_pending_per_broker;

ALTER TABLE public.instapay_submissions
  ALTER COLUMN broker_id DROP NOT NULL;

ALTER TABLE public.instapay_submissions
  ADD COLUMN IF NOT EXISTS registration_payload jsonb,
  ADD COLUMN IF NOT EXISTS claim_token_hash text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS platform_name text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS package text,
  ADD COLUMN IF NOT EXISTS reserved_subdomain text,
  ADD COLUMN IF NOT EXISTS reserved_custom_domain text,
  ADD COLUMN IF NOT EXISTS domain_type text;

COMMENT ON COLUMN public.instapay_submissions.registration_payload IS
  'Encrypted signup snapshot for deferred account creation on admin approve. Cleared after the user claims their session.';

COMMENT ON COLUMN public.instapay_submissions.claim_token_hash IS
  'SHA-256 of the one-time claim token returned to the browser for status polling without a session.';

-- Upgrade path: at most one open review per existing broker.
CREATE UNIQUE INDEX instapay_submissions_one_pending_per_broker
  ON public.instapay_submissions (broker_id)
  WHERE status = 'pending_review' AND broker_id IS NOT NULL;

-- Soft-hold uniqueness for deferred signups (released on reject / approve).
CREATE UNIQUE INDEX instapay_submissions_one_pending_per_email
  ON public.instapay_submissions (lower(email))
  WHERE status = 'pending_review' AND email IS NOT NULL;

CREATE UNIQUE INDEX instapay_submissions_one_pending_per_subdomain
  ON public.instapay_submissions (lower(reserved_subdomain))
  WHERE status = 'pending_review' AND reserved_subdomain IS NOT NULL;

CREATE UNIQUE INDEX instapay_submissions_one_pending_per_custom_domain
  ON public.instapay_submissions (lower(reserved_custom_domain))
  WHERE status = 'pending_review' AND reserved_custom_domain IS NOT NULL;

CREATE INDEX instapay_submissions_claim_token_hash_idx
  ON public.instapay_submissions (claim_token_hash)
  WHERE claim_token_hash IS NOT NULL;
