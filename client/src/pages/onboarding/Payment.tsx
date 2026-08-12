import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  CreditCard,
  Globe,
  Loader2,
  PartyPopper,
  Smartphone,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import {
  isPostPaymentPending,
  markPostPaymentPending,
} from "@/lib/postPayment";
import { useToast } from "@/hooks/use-toast";
import {
  clearOnboardingDraft,
  getOnboardingDraft,
  hasOnboardingDraft,
} from "@/lib/onboardingDraft";
import {
  clearPlanChangeDraft,
  getPlanChangeDraft,
  planChangeRequestBody,
  planChangeSummaryParams,
} from "@/lib/planChange";
import { buildSubdomainRedirect } from "@/lib/sessionRelay";
import {
  clearReachiClaimToken,
  createBrokerCheckoutSession,
  createDraftCheckoutSession,
  getReachiClaimToken,
  pollPaymentStatus,
  saveReachiClaimToken,
} from "@/lib/reachiPayment";

interface OrderSummary {
  package: string;
  planName: string;
  planPrice: number;
  currency: string;
  domainType: string;
  customDomain: string | null;
  domainPrice: number;
  total: number;
}

type PaymentMethod = "card" | "instapay" | null;

const POLL_MS = 4000;

export default function Payment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { t, i18n } = useTranslation("onboarding");
  const { t: tPricing } = useTranslation("pricing");

  const brokerId = profile?.broker_id;
  const isDraftFlow = !brokerId && hasOnboardingDraft();

  // Upgrade / downgrade of a live subscription: this pays for the plan held in
  // the draft, and success sends them back to the dashboard rather than on
  // through onboarding. `?renew=1` (the past-due retry link) means the opposite
  // — pay for the plan they already have — so it drops any upgrade they started
  // and walked away from.
  const [planChange] = useState(() => {
    if (searchParams.get("renew")) {
      clearPlanChangeDraft();
      return null;
    }
    return getPlanChangeDraft();
  });
  const isPlanChange = !!brokerId && !!planChange;

  // Are we back from the payment.reachi.ai checkout page (return_url)? That
  // status is UX-only — the poll below (driven by the claim token) is what
  // actually confirms payment, since only the webhook is authoritative.
  const returnStatus = useRef(searchParams.get("status")).current;
  const isReturningFromGateway = returnStatus !== null;

  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [currentPackage, setCurrentPackage] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>(null);
  const [processing, setProcessing] = useState(false);
  const [confirming, setConfirming] = useState(isReturningFromGateway);
  const [failed, setFailed] = useState(false);
  const [pollError, setPollError] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Strip ?status=...&order_id=...&session_id=...&sig= as soon as we've read
  // them so a refresh mid-poll doesn't re-trigger this branch.
  useEffect(() => {
    if (isReturningFromGateway) {
      navigate(window.location.pathname, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll payment status by claim token once we're back from the gateway.
  useEffect(() => {
    if (!isReturningFromGateway || paymentSuccess) return;

    const claimToken = getReachiClaimToken();
    if (!claimToken) {
      // Lost the token (different browser/device, or storage cleared) — we
      // can't confirm anything here; send them back to try again.
      setConfirming(false);
      setFailed(true);
      setMethod("card");
      return;
    }

    if (returnStatus === "failed" || returnStatus === "expired") {
      // Still worth a couple of polls in case the webhook already landed
      // (e.g. user double-backed), but don't wait long.
      setConfirming(false);
      setFailed(true);
      setMethod("card");
      clearReachiClaimToken();
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const payload = await pollPaymentStatus(claimToken);
        if (cancelled) return;
        setPollError(false);

        if (payload.status === "completed") {
          if (payload.session?.access_token && payload.session?.refresh_token) {
            await supabase.auth.setSession({
              access_token: payload.session.access_token,
              refresh_token: payload.session.refresh_token,
            });
          }
          if (payload.subdomain) {
            sessionStorage.setItem("broker_subdomain", payload.subdomain);
          }
          clearOnboardingDraft();
          clearPlanChangeDraft();
          clearReachiClaimToken();
          // Branding setup is an onboarding step — a plan change goes straight
          // back to the dashboard instead.
          if (!isPlanChange) markPostPaymentPending();
          setConfirming(false);
          setPaymentSuccess(true);
          return;
        }

        if (payload.status === "failed" || payload.status === "expired") {
          clearReachiClaimToken();
          setConfirming(false);
          setFailed(true);
          setMethod("card");
          return;
        }

        timer = setTimeout(poll, POLL_MS);
      } catch (err) {
        console.error("Payment status poll failed:", err);
        if (cancelled) return;
        setPollError(true);
        timer = setTimeout(poll, POLL_MS);
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isReturningFromGateway, returnStatus, paymentSuccess, isPlanChange]);

  useEffect(() => {
    // While we're confirming a just-completed gateway redirect, hold off —
    // once that resolves (success renders its own card; failure falls
    // through here) we need the order summary regardless.
    if (paymentSuccess || isPostPaymentPending() || confirming) return;

    let active = true;

    (async () => {
      try {
        if (isDraftFlow) {
          const draft = getOnboardingDraft();
          if (!draft?.package || draft.package === "free" || !draft.domain) {
            navigate("/select-plan", { replace: true });
            return;
          }

          const plansRes = await api.get("/plans");
          const plans = plansRes.data?.plans ?? [];
          const plan = plans.find(
            (p: { id: string }) => p.id === draft.package,
          );
          if (!plan) {
            navigate("/select-plan", { replace: true });
            return;
          }

          let domainPrice = 0;
          if (
            draft.domain.domain_type === "custom" &&
            draft.domain.custom_domain
          ) {
            const { data } = await api.get("/domains/check-custom", {
              params: { domain: draft.domain.custom_domain },
            });
            domainPrice = typeof data?.price === "number" ? data.price : 0;
          }

          if (!active) return;
          setSummary({
            package: draft.package,
            planName: plan.name,
            planPrice: plan.price,
            currency: plan.currency,
            domainType: draft.domain.domain_type,
            customDomain:
              draft.domain.domain_type === "custom"
                ? (draft.domain.custom_domain ?? null)
                : null,
            domainPrice,
            total: plan.price + domainPrice,
          });
          setIsLoading(false);
          return;
        }

        if (!brokerId) {
          navigate("/register", { replace: true });
          return;
        }

        // With a plan change in flight the quote is for the plan they're
        // moving to; the server re-validates and re-prices it either way.
        const { data } = await api.get(`/brokers/${brokerId}/order-summary`, {
          params:
            isPlanChange && planChange
              ? planChangeSummaryParams(planChange)
              : undefined,
        });
        if (!active) return;
        const s: OrderSummary = data?.summary;
        if (s?.package === "free") {
          navigate("/select-plan", { replace: true });
          return;
        }
        setSummary(s);
        setCurrentPackage(data?.planChange?.currentPackage ?? null);
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading order summary:", err);
        if (!active) return;
        toast({
          title: t("payment.toasts.loadFailedTitle"),
          description: t("payment.toasts.loadFailedDescription"),
          variant: "destructive",
        });
        setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [
    isDraftFlow,
    isPlanChange,
    planChange,
    brokerId,
    paymentSuccess,
    confirming,
    navigate,
    t,
    toast,
  ]);

  const amount = (value: number) =>
    t("payment.amount", { amount: value.toLocaleString() });

  const goToDashboard = async () => {
    const sub = sessionStorage.getItem("broker_subdomain");
    if (sub) {
      window.location.href = await buildSubdomainRedirect(
        sub,
        "/dashboard",
        i18n.language,
      );
      return;
    }
    navigate("/dashboard");
  };

  const handleCheckout = async () => {
    if (processing) return;
    setProcessing(true);
    setFailed(false);

    try {
      const returnPath = window.location.pathname;
      let payUrl: string;
      let claimToken: string | null;

      if (isDraftFlow) {
        const draft = getOnboardingDraft();
        if (!draft?.package || !draft.domain) {
          navigate("/select-plan", { replace: true });
          setProcessing(false);
          return;
        }
        ({ payUrl, claimToken } = await createDraftCheckoutSession({
          formData: draft.formData,
          package: draft.package,
          packageCategory: draft.packageCategory,
          domain: draft.domain,
          returnPath,
        }));
      } else {
        ({ payUrl, claimToken } = await createBrokerCheckoutSession(
          returnPath,
          isPlanChange && planChange
            ? planChangeRequestBody(planChange)
            : undefined,
        ));
      }

      if (claimToken) {
        saveReachiClaimToken(claimToken);
      }

      // Full browser navigation to the gateway — everything from here (card
      // form, 3DS) happens on payment.reachi.ai.
      window.location.href = payUrl;
    } catch (err) {
      console.error("Error starting checkout:", err);
      toast({
        title: t("payment.toasts.errorTitle"),
        description: t("payment.toasts.errorDescription"),
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  if (isLoading && !confirming) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="min-h-screen bg-background py-20 px-4">
        <div className="container mx-auto max-w-lg">
          <Card className="shadow-lg">
            <CardContent className="pt-10 pb-8 text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <div className="space-y-2">
                <h1 className="font-display text-3xl font-bold">
                  {t("payment.confirming.heading")}
                </h1>
                <p className="text-muted-foreground">
                  {t("payment.confirming.subheading")}
                </p>
              </div>
              {pollError && (
                <p className="text-sm text-destructive">
                  {t("payment.confirming.pollError")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-background py-20 px-4">
        <div className="container mx-auto max-w-lg">
          <Card className="border-accent/30 shadow-lg">
            <CardContent className="pt-10 pb-8 text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <PartyPopper className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="space-y-2">
                <h1 className="font-display text-3xl font-bold">
                  {isPlanChange
                    ? t("payment.planChange.successTitle")
                    : t("payment.success.title")}
                </h1>
                <p className="text-muted-foreground">
                  {isPlanChange
                    ? t("payment.planChange.successDescription")
                    : t("payment.success.description")}
                </p>
              </div>
              <Button
                variant="hero"
                size="lg"
                className="w-full"
                onClick={() =>
                  isPlanChange ? goToDashboard() : navigate("/branding-setup")
                }
              >
                {isPlanChange
                  ? t("payment.planChange.backToDashboard")
                  : t("payment.success.continue")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="container mx-auto max-w-lg">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold mb-4">
            {isPlanChange
              ? t("payment.planChange.heading")
              : t("payment.heading")}
          </h1>
          <p className="text-muted-foreground">
            {isPlanChange && currentPackage
              ? t("payment.planChange.subheading", {
                  from: tPricing(`plans.${currentPackage}.name`, {
                    defaultValue: currentPackage,
                  }),
                  to: tPricing(`plans.${summary.package}.name`, {
                    defaultValue: summary.planName,
                  }),
                })
              : t("payment.subheading")}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="w-5 h-5" />
              {t("payment.orderSummary")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {t("payment.planLine", {
                  name: tPricing(`plans.${summary.package}.name`, {
                    defaultValue: summary.planName,
                  }),
                })}
              </span>
              <span className="font-medium">{amount(summary.planPrice)}</span>
            </div>

            {summary.customDomain && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Globe className="w-4 h-4" />
                  {t("payment.domainLine", { domain: summary.customDomain })}
                </span>
                <span className="font-medium">
                  {amount(summary.domainPrice)}
                </span>
              </div>
            )}

            <div className="border-t pt-4 flex items-center justify-between">
              <span className="font-semibold">{t("payment.total")}</span>
              <span className="font-display text-xl font-bold">
                {amount(summary.total)}
              </span>
            </div>
          </CardContent>
        </Card>

        {method === null && (
          <div className="mt-8 space-y-3">
            <p className="text-sm font-medium text-center text-muted-foreground mb-4">
              {t("payment.chooseMethod")}
            </p>
            <Button
              variant="hero"
              size="lg"
              className="w-full"
              onClick={() => setMethod("card")}
            >
              <CreditCard className="w-4 h-4 me-2" />
              {t("payment.methods.card")}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => navigate("/payment/instapay")}
            >
              <Smartphone className="w-4 h-4 me-2" />
              {t("payment.methods.instapay")}
            </Button>
          </div>
        )}

        {method === "card" && (
          <>
            {failed && (
              <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-center">
                <div className="flex justify-center mb-2">
                  <XCircle className="w-8 h-8 text-destructive" />
                </div>
                <p className="font-semibold text-destructive">
                  {t("payment.failed.title")}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("payment.failed.description")}
                </p>
              </div>
            )}

            <div className="mt-8 space-y-3">
              <Button
                variant="hero"
                size="lg"
                className="w-full"
                disabled={processing}
                onClick={handleCheckout}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin me-2" />
                    {t("payment.processing")}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 me-2" />
                    {failed
                      ? t("payment.failed.retry")
                      : t("payment.payButton")}
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                disabled={processing}
                onClick={() => {
                  setMethod(null);
                  setFailed(false);
                }}
              >
                {t("payment.backToMethods")}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
