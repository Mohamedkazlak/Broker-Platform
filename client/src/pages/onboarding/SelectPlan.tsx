import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { buildSubdomainRedirect } from "@/lib/sessionRelay";
import { useToast } from "@/hooks/use-toast";
import { Check, Globe, Loader2 } from "lucide-react";
import {
  clearOnboardingDraft,
  getOnboardingDraft,
  updateOnboardingDraft,
} from "@/lib/onboardingDraft";
import { isPostPaymentPending } from "@/lib/postPayment";
import { PlanCategoryTabs } from "@/components/pricing/PlanCategoryTabs";
import {
  DEFAULT_PACKAGE_CATEGORY,
  PLAN_CATEGORIES,
  UNLIMITED_PACKAGE_LIMIT,
  planColors,
  planIcons,
  type ApiPlan,
  type PackageCategory,
  type PlanId,
} from "@/lib/plans";

const PANEL_ID = "select-plan-panel";

export default function SelectPlan() {
  const navigate = useNavigate();
  const { profile, completeRegistration } = useAuth();
  const { toast } = useToast();
  const { t, i18n } = useTranslation("pricing");

  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [category, setCategory] = useState<PackageCategory>(
    DEFAULT_PACKAGE_CATEGORY,
  );

  const draft = getOnboardingDraft();
  const isDraftFlow = !!draft && !profile?.broker_id;

  useEffect(() => {
    if (isPostPaymentPending()) {
      navigate("/branding-setup", { replace: true });
      return;
    }
    if (!isDraftFlow && !profile?.broker_id) {
      navigate("/register", { replace: true });
    }
  }, [isDraftFlow, profile?.broker_id, navigate]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get("/plans");
        if (active) setPlans(res.data?.plans ?? []);
      } catch (err) {
        console.error("Error loading plans:", err);
        if (active) {
          toast({
            title: t("subscription.toasts.loadFailedTitle"),
            description: t("subscription.toasts.loadFailedDescription"),
            variant: "destructive",
          });
        }
      } finally {
        if (active) setIsLoadingPlans(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [t, toast]);

  const formatLimit = (limit: number) =>
    limit >= UNLIMITED_PACKAGE_LIMIT
      ? t("subscription.unlimitedListings")
      : t("subscription.listingLimit", { count: limit });

  /**
   * Domain-led plans (Max, Ultra) sell the custom domain, not the listing
   * count, so their card leads with that instead of the allowance.
   */
  const cardHeadline = (plan: ApiPlan) =>
    plan.headline === "domain"
      ? t("subscription.ownDomainHeadline")
      : formatLimit(plan.packageLimit);

  // Fall back to the local grouping if the API response predates categories,
  // so a rolling deploy can't leave this page with an empty grid.
  const visiblePlans = plans.filter((plan) =>
    (plan.categories ?? PLAN_CATEGORIES[plan.id] ?? []).includes(category),
  );

  const handleSelectPlan = async (planId: PlanId) => {
    setSelecting(planId);

    // New signup: hold data in draft until free activation or paid payment.
    if (isDraftFlow) {
      const currentDraft = getOnboardingDraft();
      if (!currentDraft) {
        navigate("/register", { replace: true });
        return;
      }

      try {
        if (planId === "free") {
          const { error, subdomain } = await completeRegistration({
            formData: currentDraft.formData,
            package: "free",
            packageCategory: category,
          });

          if (error) {
            toast({
              title: t("subscription.toasts.errorTitle"),
              description: error.message,
              variant: "destructive",
            });
            setSelecting(null);
            return;
          }

          clearOnboardingDraft();
          if (subdomain) {
            const url = await buildSubdomainRedirect(
              subdomain,
              "/dashboard",
              i18n.language,
            );
            window.location.href = url;
            return;
          }
          navigate("/dashboard");
          return;
        }

        updateOnboardingDraft({ package: planId, packageCategory: category });
        navigate("/domain-setup");
      } catch (err) {
        console.error("Error selecting plan:", err);
        toast({
          title: t("subscription.toasts.errorTitle"),
          description: t("subscription.toasts.errorDescription"),
          variant: "destructive",
        });
        setSelecting(null);
      }
      return;
    }

    // Existing broker upgrading (already in DB).
    if (!profile?.broker_id) {
      toast({
        title: t("subscription.toasts.errorTitle"),
        description: t("subscription.toasts.noBrokerDescription"),
        variant: "destructive",
      });
      setSelecting(null);
      return;
    }

    try {
      const res = await api.post(`/brokers/${profile.broker_id}/select-plan`, {
        package: planId,
        packageCategory: category,
      });
      const { redirect, subdomain } = res.data ?? {};

      if (redirect === "dashboard") {
        const sub = subdomain || sessionStorage.getItem("broker_subdomain");
        sessionStorage.removeItem("broker_subdomain");
        if (sub) {
          const url = await buildSubdomainRedirect(
            sub,
            "/dashboard",
            i18n.language,
          );
          window.location.href = url;
          return;
        }
        navigate("/dashboard");
        return;
      }

      navigate("/domain-setup");
    } catch (err) {
      console.error("Error selecting plan:", err);
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;

      // 401 means the stored session was rejected by the auth server; the api
      // client is already bouncing to login, so explain that instead of
      // inviting a retry that cannot work.
      if (status === 401) {
        toast({
          title: t("subscription.toasts.sessionExpiredTitle"),
          description: t("subscription.toasts.sessionExpiredDescription"),
          variant: "destructive",
        });
        return;
      }

      const serverMessage = axios.isAxiosError(err)
        ? (err.response?.data as { error?: string } | undefined)?.error
        : undefined;

      toast({
        title: t("subscription.toasts.errorTitle"),
        description: serverMessage || t("subscription.toasts.errorDescription"),
        variant: "destructive",
      });
      setSelecting(null);
    }
  };

  const canSelect = isDraftFlow || !!profile?.broker_id;

  return (
    <div className="min-h-screen bg-muted/40 py-16 md:py-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl font-bold mb-4">
            {t("subscription.heading")}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t("subscription.subheading")}
          </p>
        </div>

        <div className="flex flex-col items-center text-center mb-10">
          <PlanCategoryTabs
            value={category}
            onChange={setCategory}
            panelId={PANEL_ID}
          />
          <p className="mt-4 text-sm text-muted-foreground max-w-xl">
            {t(`categories.${category}.description`)}
          </p>
        </div>

        {isLoadingPlans ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div
            id={PANEL_ID}
            role="tabpanel"
            aria-labelledby={`plan-category-tab-${category}`}
            className={`grid grid-cols-1 gap-3 md:gap-4 items-stretch ${
              visiblePlans.length > 2
                ? "md:grid-cols-2 xl:grid-cols-4"
                : "md:grid-cols-2 max-w-4xl mx-auto"
            }`}
          >
            {visiblePlans.map((plan) => {
              const colors = planColors[plan.id];
              const Icon = planIcons[plan.id] ?? Globe;
              const highlighted = plan.recommended && category === "personal";
              const solidButton = plan.id === "pro" || plan.id === "max";
              return (
                <Card
                  key={`${category}-${plan.id}`}
                  className={`relative flex h-full flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover ${colors.border} ${colors.surface ?? ""}`}
                >
                  {highlighted && (
                    <div
                      className={`absolute top-3 end-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        colors.badge || ""
                      }`}
                    >
                      {t("subscription.recommended")}
                    </div>
                  )}
                  <CardHeader className="space-y-2.5 p-5 pb-3 md:p-6 md:pb-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.icon}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <CardTitle className="font-display text-xl md:text-2xl font-bold pe-14">
                      {plan.name}
                    </CardTitle>
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                        {plan.price.toLocaleString()}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {t("pricePerMonth")}
                      </span>
                    </div>
                    <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                      {cardHeadline(plan)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-5 px-5 pb-5 md:px-6 md:pb-6 pt-0">
                    <Button
                      onClick={() => handleSelectPlan(plan.id)}
                      disabled={selecting !== null || !canSelect}
                      className={`w-full h-10 md:h-11 rounded-full text-sm font-semibold transition-colors duration-300 ${colors.button}`}
                      variant={solidButton ? "default" : "outline"}
                    >
                      {selecting === plan.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        t("subscription.selectPlan")
                      )}
                    </Button>
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${colors.icon}`}
                          >
                            <Check className="w-3 h-3" />
                          </div>
                          <span className="text-sm text-muted-foreground leading-snug">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
