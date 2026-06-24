import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  CreditCard,
  Globe,
  Loader2,
  PartyPopper,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { markPostPaymentPending } from "@/pages/onboarding/BrandingSetup";
import { useToast } from "@/hooks/use-toast";

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

/** Artificial delay so the simulated charge feels like a real round-trip. */
const PROCESSING_DELAY_MS = 1200;

export default function Payment() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation("onboarding");

  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [processing, setProcessing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const brokerId = profile?.broker_id;

  useEffect(() => {
    if (!brokerId) return;
    let active = true;
    (async () => {
      try {
        const { data } = await api.get(`/brokers/${brokerId}/order-summary`);
        if (!active) return;
        const s: OrderSummary = data?.summary;
        // Free plans never pass through payment — bounce them back.
        if (s?.package === "free") {
          navigate("/select-plan", { replace: true });
          return;
        }
        setSummary(s);
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
  }, [brokerId, navigate, t, toast]);

  const amount = (value: number) =>
    t("payment.amount", { amount: value.toLocaleString() });

  const handlePay = async (outcome: "succeed" | "fail") => {
    if (!brokerId || processing) return;
    setProcessing(true);
    setFailed(false);

    // Simulated processor latency.
    await new Promise((resolve) => setTimeout(resolve, PROCESSING_DELAY_MS));

    try {
      const { data } = await api.post(`/brokers/${brokerId}/simulate-payment`, {
        outcome,
      });

      if (data?.outcome === "succeed") {
        const sub =
          data?.subdomain || sessionStorage.getItem("broker_subdomain");
        if (sub) {
          sessionStorage.setItem("broker_subdomain", sub);
        }
        markPostPaymentPending();
        setPaymentSuccess(true);
        setProcessing(false);
        return;
      }

      // Payment failed (broker is now past_due) — show retry.
      setFailed(true);
      setProcessing(false);
    } catch (err) {
      console.error("Error simulating payment:", err);
      toast({
        title: t("payment.toasts.errorTitle"),
        description: t("payment.toasts.errorDescription"),
        variant: "destructive",
      });
      setProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!summary) return null;

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
                  {t("payment.success.title")}
                </h1>
                <p className="text-muted-foreground">
                  {t("payment.success.description")}
                </p>
              </div>
              <Button
                variant="hero"
                size="lg"
                className="w-full"
                onClick={() => navigate("/branding-setup")}
              >
                {t("payment.success.continue")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="container mx-auto max-w-lg">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold mb-4">
            {t("payment.heading")}
          </h1>
          <p className="text-muted-foreground">{t("payment.subheading")}</p>
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
                {t("payment.planLine", { name: summary.planName })}
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
          {failed ? (
            <Button
              variant="hero"
              size="lg"
              className="w-full"
              disabled={processing}
              onClick={() => handlePay("succeed")}
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("payment.failed.retry")
              )}
            </Button>
          ) : (
            <>
              <Button
                variant="hero"
                size="lg"
                className="w-full"
                disabled={processing}
                onClick={() => handlePay("succeed")}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin me-2" />
                    {t("payment.processing")}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 me-2" />
                    {t("payment.succeedButton")}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                disabled={processing}
                onClick={() => handlePay("fail")}
              >
                <XCircle className="w-4 h-4 me-2" />
                {t("payment.failButton")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
