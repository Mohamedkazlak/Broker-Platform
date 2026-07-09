import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { buildSubdomainRedirect } from "@/lib/sessionRelay";
import { useToast } from "@/hooks/use-toast";
import { Check, Star, Zap, Building2, Globe, Loader2 } from "lucide-react";
import {
  clearOnboardingDraft,
  getOnboardingDraft,
  updateOnboardingDraft,
  type PlanId,
} from "@/lib/onboardingDraft";

/** Plans larger than this are shown as "unlimited" rather than a raw count. */
const UNLIMITED_PACKAGE_LIMIT = 999999;

interface ApiPlan {
  id: PlanId;
  name: string;
  price: number;
  currency: string;
  billingInterval: string;
  packageLimit: number;
  customDomain: boolean;
  features: string[];
}

const planIcons: Record<PlanId, typeof Globe> = {
  free: Globe,
  plus: Building2,
  pro: Star,
  ultra: Zap,
};

const planColors: Record<
  PlanId,
  { border: string; icon: string; badge?: string; button: string }
> = {
  free: {
    border: "border-border hover:border-blue-300 border-t-4 border-t-blue-500",
    icon: "bg-blue-100 text-blue-600",
    button: "hover:bg-blue-600 hover:text-white hover:border-blue-600",
  },
  plus: {
    border:
      "border-border hover:border-emerald-300 border-t-4 border-t-emerald-500",
    icon: "bg-emerald-100 text-emerald-600",
    button: "hover:bg-emerald-600 hover:text-white hover:border-emerald-600",
  },
  pro: {
    border: "border-accent shadow-gold border-t-4 border-t-accent",
    icon: "bg-accent text-accent-foreground",
    badge: "bg-accent text-accent-foreground",
    button: "hover:opacity-90 transition-opacity",
  },
  ultra: {
    border:
      "border-border hover:border-purple-300 border-t-4 border-t-purple-500",
    icon: "bg-purple-100 text-purple-600",
    button: "hover:bg-purple-600 hover:text-white hover:border-purple-600",
  },
};

export default function SelectPlan() {
  const navigate = useNavigate();
  const { profile, completeRegistration } = useAuth();
  const { toast } = useToast();
  const { t, i18n } = useTranslation("pricing");

  const [plans, setPlans] = useState<ApiPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  const draft = getOnboardingDraft();
  const isDraftFlow = !!draft && !profile?.broker_id;

  useEffect(() => {
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
            title: t("subscription.toasts.errorTitle"),
            description: t("subscription.toasts.errorDescription"),
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

        updateOnboardingDraft({ package: planId });
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
      toast({
        title: t("subscription.toasts.errorTitle"),
        description: t("subscription.toasts.errorDescription"),
        variant: "destructive",
      });
      setSelecting(null);
    }
  };

  const canSelect = isDraftFlow || !!profile?.broker_id;

  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl font-bold mb-4">
            {t("subscription.heading")}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t("subscription.subheading")}
          </p>
        </div>

        {isLoadingPlans ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const colors = planColors[plan.id];
              const Icon = planIcons[plan.id] ?? Globe;
              const highlighted = plan.id === "pro";
              return (
                <Card
                  key={plan.id}
                  className={`relative overflow-hidden transition-all duration-300 hover:-translate-y-1 ${colors.border}`}
                >
                  {highlighted && (
                    <div
                      className={`absolute inset-x-0 top-0 text-center py-1.5 text-xs font-bold ${
                        colors.badge || ""
                      }`}
                    >
                      {t("subscription.recommended")}
                    </div>
                  )}
                  <CardHeader className={highlighted ? "pt-8" : ""}>
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colors.icon}`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="font-display text-xl">
                      {plan.name}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {formatLimit(plan.packageLimit)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6">
                      <span className="font-display text-4xl font-bold text-foreground">
                        {plan.price.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground ms-2">
                        {t("pricePerMonth")}
                      </span>
                    </div>
                    <ul className="space-y-3 min-h-[150px]">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${colors.icon}`}
                          >
                            <Check className="w-3 h-3" />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={() => handleSelectPlan(plan.id)}
                      disabled={selecting !== null || !canSelect}
                      className={`w-full transition-colors duration-300 ${colors.button}`}
                      variant={highlighted ? "hero" : "outline"}
                    >
                      {selecting === plan.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        t("subscription.selectPlan")
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
