import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Clock, Loader2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import api from "@/lib/api";
import { clearOnboardingDraft } from "@/lib/onboardingDraft";
import { markPostPaymentPending } from "@/lib/postPayment";
import { buildTenantUrl } from "@/utils/tenant";
import {
  clearInstapayClaimToken,
  getInstapayClaimToken,
  type InstapaySubmissionStatus,
} from "@/lib/instapay";

const POLL_MS = 5000;

interface StatusPayload {
  subscriptionStatus: string;
  subdomain: string | null;
  package: string | null;
  session?: {
    access_token: string;
    refresh_token: string;
  } | null;
  submission: {
    id: string;
    status: InstapaySubmissionStatus;
    rejectionReason: string | null;
  } | null;
}

export default function InstapayPending() {
  const navigate = useNavigate();
  const { t } = useTranslation("onboarding");

  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [subdomain, setSubdomain] = useState<string | null>(() =>
    sessionStorage.getItem("broker_subdomain"),
  );
  const [loadError, setLoadError] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const claimToken = getInstapayClaimToken();
    if (!claimToken) {
      navigate("/payment", { replace: true });
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const { data } = await api.get("/instapay/status", {
          params: { token: claimToken },
        });
        if (cancelled) return;

        const payload = data?.data as StatusPayload;
        setStatus(payload);
        setLoadError(false);

        if (payload?.subdomain) {
          setSubdomain(payload.subdomain);
          sessionStorage.setItem("broker_subdomain", payload.subdomain);
        }

        const submissionStatus = payload?.submission?.status;
        const isActive =
          payload?.subscriptionStatus === "active" ||
          submissionStatus === "approved";

        if (isActive) {
          setRedirecting(true);

          if (payload.session?.access_token && payload.session?.refresh_token) {
            await supabase.auth.setSession({
              access_token: payload.session.access_token,
              refresh_token: payload.session.refresh_token,
            });
          }

          clearOnboardingDraft();
          clearInstapayClaimToken();
          markPostPaymentPending();
          navigate("/branding-setup", { replace: true });
          return;
        }

        if (submissionStatus === "rejected") {
          return;
        }

        timer = setTimeout(poll, POLL_MS);
      } catch (err) {
        console.error("Instapay status poll failed:", err);
        if (cancelled) return;
        setLoadError(true);
        timer = setTimeout(poll, POLL_MS);
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [navigate]);

  const rejected = status?.submission?.status === "rejected";
  const platformUrl = subdomain ? buildTenantUrl(subdomain) : null;

  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="container mx-auto max-w-lg">
        <Card className="shadow-lg">
          <CardContent className="pt-10 pb-8 text-center space-y-6">
            {rejected ? (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <div className="space-y-2">
                  <h1 className="font-display text-3xl font-bold">
                    {t("instapay.pending.rejectedTitle")}
                  </h1>
                  <p className="text-muted-foreground">
                    {status?.submission?.rejectionReason ||
                      t("instapay.pending.rejectedFallback")}
                  </p>
                </div>
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    clearInstapayClaimToken();
                    navigate("/payment", { replace: true });
                  }}
                >
                  {t("instapay.pending.tryAgain")}
                </Button>
              </>
            ) : (
              <>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  {redirecting ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  ) : (
                    <Clock className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div className="space-y-2">
                  <h1 className="font-display text-3xl font-bold">
                    {t("instapay.pending.heading")}
                  </h1>
                  <p className="text-muted-foreground">
                    {t("instapay.pending.subheading")}
                  </p>
                </div>

                {platformUrl && (
                  <div className="rounded-lg border border-border bg-muted/30 px-4 py-4 text-start space-y-2">
                    <p className="text-sm font-medium">
                      {t("instapay.pending.platformLinkLabel")}
                    </p>
                    <p className="break-all font-mono text-sm text-muted-foreground">
                      {platformUrl}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("instapay.pending.platformLinkHint")}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("instapay.pending.checking")}
                </div>
                {loadError && (
                  <p className="text-sm text-destructive">
                    {t("instapay.pending.pollError")}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
