import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getOnboardingDraft, hasOnboardingDraft } from "@/lib/onboardingDraft";
import { INSTAPAY_ACCOUNT } from "@/lib/instapay";
import api from "@/lib/api";

export default function InstapayPayment() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation("onboarding");

  const brokerId = profile?.broker_id;
  const isDraftFlow = !brokerId && hasOnboardingDraft();

  const [checking, setChecking] = useState(true);
  const [amountLabel, setAmountLabel] = useState<string | null>(null);

  useEffect(() => {
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
          const plan = (plansRes.data?.plans ?? []).find(
            (p: { id: string; price: number }) => p.id === draft.package,
          );
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
          const total = (plan?.price ?? 0) + domainPrice;
          setAmountLabel(
            t("payment.amount", { amount: total.toLocaleString() }),
          );
          setChecking(false);
          return;
        }

        if (!brokerId) {
          navigate("/register", { replace: true });
          return;
        }

        const { data } = await api.get(`/brokers/${brokerId}/order-summary`);
        if (!active) return;
        const total = data?.summary?.total ?? 0;
        setAmountLabel(t("payment.amount", { amount: total.toLocaleString() }));
        setChecking(false);
      } catch (err) {
        console.error("Error loading Instapay order:", err);
        if (!active) return;
        toast({
          title: t("payment.toasts.loadFailedTitle"),
          description: t("payment.toasts.loadFailedDescription"),
          variant: "destructive",
        });
        navigate("/payment", { replace: true });
      }
    })();

    return () => {
      active = false;
    };
  }, [brokerId, isDraftFlow, navigate, t, toast]);

  const copyHandle = async () => {
    try {
      await navigator.clipboard.writeText(INSTAPAY_ACCOUNT.handle);
      toast({ title: t("instapay.copied") });
    } catch {
      toast({
        title: t("payment.toasts.errorTitle"),
        description: t("payment.toasts.errorDescription"),
        variant: "destructive",
      });
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="container mx-auto max-w-lg">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold mb-4">
            {t("instapay.qr.heading")}
          </h1>
          <p className="text-muted-foreground">{t("instapay.qr.subheading")}</p>
          {amountLabel && (
            <p className="mt-3 font-display text-2xl font-bold">
              {amountLabel}
            </p>
          )}
        </div>

        <Card>
          <CardContent className="pt-8 pb-6 space-y-6">
            <div className="mx-auto w-full max-w-[280px]">
              <img
                src={INSTAPAY_ACCOUNT.qrImagePath}
                alt={t("instapay.qr.imageAlt")}
                className="w-full h-auto rounded-lg border border-border bg-white p-3"
              />
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("instapay.qr.handleLabel")}
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <code className="rounded-md bg-muted px-3 py-1.5 text-sm font-medium">
                  {INSTAPAY_ACCOUNT.handle}
                </code>
                <Button variant="outline" size="sm" onClick={copyHandle}>
                  <Copy className="w-3.5 h-3.5 me-1.5" />
                  {t("instapay.qr.copy")}
                </Button>
              </div>
            </div>

            <a
              href={INSTAPAY_ACCOUNT.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              {t("instapay.qr.openLink")}
            </a>

            <p className="text-xs text-center text-muted-foreground">
              {t("instapay.qr.manualNote")}
            </p>
          </CardContent>
        </Card>

        <div className="mt-8 space-y-3">
          <p className="text-sm font-medium text-center">
            {t("instapay.qr.confirmPrompt")}
          </p>
          <Button
            variant="hero"
            size="lg"
            className="w-full"
            onClick={() => navigate("/payment/instapay/receipt")}
          >
            <CheckCircle2 className="w-4 h-4 me-2" />
            {t("instapay.qr.successful")}
          </Button>
          <Button variant="outline" size="lg" className="w-full" asChild>
            <Link to="/payment">
              <XCircle className="w-4 h-4 me-2" />
              {t("instapay.qr.notSuccessful")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
