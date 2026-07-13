-- Instapay manual payment submissions (receipt upload + admin review).
-- Client confirmation is not verification; admin approval activates the subscription.

CREATE TABLE public.instapay_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id uuid NOT NULL REFERENCES public.brokers (id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'EGP',
  status text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'rejected')),
  receipt_path text NOT NULL,
  receipt_mime_type text,
  rejection_reason text,
  reviewed_by uuid REFERENCES public.admin_users (id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX instapay_submissions_broker_id_idx
  ON public.instapay_submissions (broker_id);

CREATE INDEX instapay_submissions_status_created_idx
  ON public.instapay_submissions (status, created_at DESC);

-- At most one open review per broker.
CREATE UNIQUE INDEX instapay_submissions_one_pending_per_broker
  ON public.instapay_submissions (broker_id)
  WHERE status = 'pending_review';

COMMENT ON TABLE public.instapay_submissions IS
  'Manual Instapay payment proofs awaiting admin approval before subscription activation.';

ALTER TABLE public.instapay_submissions ENABLE ROW LEVEL SECURITY;

-- Brokers can read their own submissions (status polling on the pending screen).
CREATE POLICY "Brokers can view own instapay submissions"
  ON public.instapay_submissions
  FOR SELECT
  TO authenticated
  USING (broker_id = public.get_auth_broker_id());

-- Writes go through the Express API with the service role (bypasses RLS).
-- No INSERT/UPDATE/DELETE policies for authenticated clients.

-- Private receipt images. Uploads/reads use the service role from the API.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'instapay-receipts',
  'instapay-receipts',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;
