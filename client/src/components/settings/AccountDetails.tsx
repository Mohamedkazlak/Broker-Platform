import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CreditCard,
  Globe,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useBroker } from "@/contexts/BrokerContext";
import api from "@/lib/api";
import { buildMainSiteUrl } from "@/utils/tenant";

interface AccountData {
  package: string;
  domain_type: string;
  subdomain: string;
  custom_domain: string | null;
  subscription_status: string;
  next_billing_date: string | null;
  billing_amount: number | string | null;
  days_until_next_payment: number | null;
}

interface ApiPlan {
  id: string;
  name: string;
  price: number;
}

export function AccountDetails() {
  const { profile } = useAuth();
  const { broker } = useBroker();
  const { t, i18n } = useTranslation("dashboard");

  const [account, setAccount] = useState<AccountData | null>(null);
  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // The authenticated broker owns this dashboard; its id matches BrokerContext.
  const brokerId = profile?.broker_id ?? broker?.id;

  useEffect(() => {
    if (!brokerId || brokerId === "demo-broker-id") {
      setIsLoading(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const [brokerRes, plansRes] = await Promise.all([
          api.get(`/brokers/${brokerId}`),
          api.get("/plans"),
        ]);
        if (!active) return;
        setAccount(brokerRes.data?.data ?? null);
        setPlans(plansRes.data?.plans ?? []);
      } catch (err) {
        console.error("Error loading account details:", err);
        if (active) setError(true);
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [brokerId]);

  const localeNum = i18n.language?.startsWith("ar") ? "ar-EG" : "en-US";
  const formatAmount = (value: number) =>
    t("settings.account.amount", { amount: value.toLocaleString(localeNum) });

  // Cross-host links: plan selection and payment live on the main host, so we
  // need a real navigation (window.location), not client-side routing. Mirrors
  // the existing buildMainSiteUrl / buildTenantUrl language-prefixed pattern.
  const goToMainHost = (path: string) => {
    window.location.href = buildMainSiteUrl(`/${i18n.language}${path}`);
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      );
    }

    if (error || !account) {
      return (
        <p className="text-sm text-destructive">
          {t("settings.account.loadError")}
        </p>
      );
    }

    const plan = plans.find((p) => p.id === account.package);
    const planName = plan?.name ?? account.package;
    const isCustom =
      account.domain_type === "custom" && !!account.custom_domain;
    const isFree = account.package === "free";
    const isPastDue = account.subscription_status === "past_due";
    const billingAmount = Number(account.billing_amount ?? 0);

    return (
      <div className="space-y-5">
        {isPastDue && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-semibold text-destructive">
                  {t("settings.account.pastDue.title")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("settings.account.pastDue.description")}
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => goToMainHost("/payment")}
                >
                  <CreditCard className="w-4 h-4 me-2" />
                  {t("settings.account.pastDue.retry")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Plan */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            {t("settings.account.planLabel")}
          </span>
          <span className="font-medium text-end">
            {planName}
            {!isFree && plan && (
              <span className="text-muted-foreground font-normal ms-2">
                {t("settings.account.planPrice", {
                  price: plan.price.toLocaleString(localeNum),
                })}
              </span>
            )}
          </span>
        </div>

        {/* Domain */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            {t("settings.account.domainLabel")}
          </span>
          <span className="flex items-center gap-2 font-medium" dir="ltr">
            {isCustom ? account.custom_domain : account.subdomain}
            <Badge variant={isCustom ? "default" : "secondary"}>
              {isCustom ? (
                <Sparkles className="w-3 h-3 me-1" />
              ) : (
                <Globe className="w-3 h-3 me-1" />
              )}
              {isCustom
                ? t("settings.account.badgeCustom")
                : t("settings.account.badgeSubdomain")}
            </Badge>
          </span>
        </div>

        {/* Billing */}
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            {t("settings.account.billingLabel")}
          </span>
          <span className="font-medium text-end">
            {isFree
              ? t("settings.account.freeNoBilling")
              : account.days_until_next_payment != null
                ? t("settings.account.daysUntil", {
                    days: account.days_until_next_payment,
                    amount: formatAmount(billingAmount),
                  })
                : "—"}
          </span>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            variant="outline"
            onClick={() => goToMainHost("/select-plan")}
          >
            <Sparkles className="w-4 h-4 me-2" />
            {t("settings.account.upgrade")}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">
            {t("settings.account.heading")}
          </CardTitle>
        </div>
        <CardDescription>{t("settings.account.description")}</CardDescription>
      </CardHeader>
      <CardContent>{renderBody()}</CardContent>
    </Card>
  );
}
