-- Review before applying. Do NOT auto-apply.
-- Extends payment_sessions + brokers for the Max-plan custom-domain purchase
-- flow (Reachi checkout → name.com buy → DNS → Render attach).
-- Style matches 2026-10-05_broker_domain_provisioning.sql: plain text status
-- columns with COMMENT docs, not Postgres enums (lifecycle values change;
-- catalog enums like subscription_plan_enum stay as enums elsewhere).
--
-- payment_sessions.status values we write today:
--   pending | completed | failed | refunded
-- ("paid" in product language == status = 'completed'.)
--
-- payment_sessions.domain_fulfillment_status:
--   none | pending | registering | registered | failed
--
-- payment_sessions.refund_status:
--   none | requested | refunded | failed
--
-- brokers.domain_status values written today:
--   registering | dns_pending | attaching | active | needs_review
-- Full set we want going forward (still text, no enum):
--   registering | dns_pending | attaching | verifying | active | needs_review | failed
-- (tests also mention 'pending' as a non-servable state; keep that out of the
-- live write-path unless product needs a pre-pipeline placeholder.)

-- ---------- payment_sessions ----------
ALTER TABLE payment_sessions
  -- Already present in live DB / paymentModel (plan-change checkout). IF NOT
  -- EXISTS keeps this file safe to re-run and documents the draft-hold use.
  ADD COLUMN IF NOT EXISTS requested_custom_domain text,
  ADD COLUMN IF NOT EXISTS domain_quoted_price_usd numeric,
  ADD COLUMN IF NOT EXISTS domain_quoted_price_egp numeric,
  ADD COLUMN IF NOT EXISTS domain_hold_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS domain_fulfillment_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS refund_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS refund_reason text,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS broker_notified_at timestamptz;

COMMENT ON COLUMN payment_sessions.requested_custom_domain IS
  'Plain-text custom domain this checkout is buying (draft + broker); queryable hold, not a secret';
COMMENT ON COLUMN payment_sessions.domain_quoted_price_usd IS
  'Wholesale USD ceiling locked at checkout and sent to name.com as purchasePrice';
COMMENT ON COLUMN payment_sessions.domain_quoted_price_egp IS
  'EGP domain line item charged on this Reachi session (one-time fee)';
COMMENT ON COLUMN payment_sessions.domain_hold_expires_at IS
  'When a pending checkout stops holding this domain for other buyers';
COMMENT ON COLUMN payment_sessions.domain_fulfillment_status IS
  'Post-payment domain pipeline on the session: none | pending | registering | registered | failed';
COMMENT ON COLUMN payment_sessions.refund_status IS
  'Domain/plan refund tracking: none | requested | refunded | failed';
COMMENT ON COLUMN payment_sessions.refund_reason IS
  'Why a refund was requested or failed (e.g. registration permanently failed)';
COMMENT ON COLUMN payment_sessions.refunded_at IS
  'When we recorded a successful refund for this session';
COMMENT ON COLUMN payment_sessions.broker_notified_at IS
  'When we told the broker about a domain failure / refund (idempotency for notify)';

-- One live hold per custom domain.
-- "Live" = pending or completed (paid), not failed/refunded on the session
-- payment status, refund_status still none, fulfillment not failed.
-- Postgres cannot use now() in a partial index (not IMMUTABLE), so expired
-- pending holds must be released by a sweeper (flip status out of pending, or
-- clear requested_custom_domain) once domain_hold_expires_at has passed —
-- otherwise the unique index alone will not free the name.
CREATE UNIQUE INDEX IF NOT EXISTS payment_sessions_live_custom_domain_uniq
  ON payment_sessions (lower(requested_custom_domain))
  WHERE requested_custom_domain IS NOT NULL
    AND status IN ('pending', 'completed')
    AND refund_status = 'none'
    AND domain_fulfillment_status <> 'failed';

-- ---------- brokers ----------
ALTER TABLE brokers
  ADD COLUMN IF NOT EXISTS name_com_order_id text,
  ADD COLUMN IF NOT EXISTS render_domain_id text,
  ADD COLUMN IF NOT EXISTS domain_dns_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS domain_verify_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS domain_provisioned_at timestamptz;

COMMENT ON COLUMN brokers.name_com_order_id IS
  'name.com order id from a successful registerDomain response (support / idempotency)';
COMMENT ON COLUMN brokers.render_domain_id IS
  'Render custom-domain id returned by addCustomDomain (stable verify/get target)';
COMMENT ON COLUMN brokers.domain_dns_attempts IS
  'How many times we retried creating/fixing name.com DNS records';
COMMENT ON COLUMN brokers.domain_verify_attempts IS
  'How many times domainMonitor retried Render verification for this domain';
COMMENT ON COLUMN brokers.domain_provisioned_at IS
  'When domain_status first became active (successful end-to-end provision)';
