import { useState, useEffect } from "react";
import {
  Building2,
  Menu,
  Package,
  CheckCircle2,
  DollarSign,
  Key,
  Info,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTranslation, Trans } from "react-i18next";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import {
  computeRevenue,
  formatRevenue,
  type RevenueStats,
} from "@/utils/formatRevenue";

const PLAN_LIMITS: Record<string, number> = {
  free: 3,
  plus: 10,
  pro: 50,
  ultra: Infinity,
};

interface PropertyStats {
  active: number;
  sold: number;
  rented: number;
  total: number;
}

const EMPTY_REVENUE: RevenueStats = {
  total: 0,
  selling: 0,
  renting: 0,
  currency: "EGP",
};

export default function DashboardInsights() {
  const { profile, isLoading } = useAuth();
  const { t, i18n } = useTranslation("dashboard");
  const { t: tPricing } = useTranslation("pricing");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [propertyStats, setPropertyStats] = useState<PropertyStats>({
    active: 0,
    sold: 0,
    rented: 0,
    total: 0,
  });
  const [revenueStats, setRevenueStats] = useState<RevenueStats>(EMPTY_REVENUE);
  const [loadingData, setLoadingData] = useState(true);
  const [adminPackage, setAdminPackage] = useState<string>("free");

  const plan = adminPackage || "free";
  const planLimit = PLAN_LIMITS[plan] || 3;
  const usedSlots = propertyStats.total;
  const usagePercent =
    planLimit === Infinity
      ? 0
      : Math.min(100, Math.round((usedSlots / planLimit) * 100));

  const planLabels: Record<string, string> = {
    free: tPricing("plans.starter.name"),
    plus: tPricing("plans.plus.name"),
    pro: tPricing("plans.pro.name"),
    ultra: tPricing("plans.ultra.name"),
  };

  useEffect(() => {
    if (!profile?.broker_id) return;
    fetchData();
  }, [profile?.broker_id]);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [brokerRes, propertiesRes] = await Promise.all([
        supabase
          .from("brokers")
          .select("package")
          .eq("id", profile!.broker_id)
          .single(),
        supabase
          .from("properties")
          .select("id, status, price, currency")
          .eq("broker_id", profile!.broker_id),
      ]);

      if (brokerRes.data) {
        setAdminPackage(brokerRes.data.package);
      }

      if (propertiesRes.data) {
        const props = propertiesRes.data;
        const active = props.filter((p) => p.status === "active").length;
        const sold = props.filter((p) => p.status === "sold").length;
        const rented = props.filter((p) => p.status === "rented").length;
        setPropertyStats({ active, sold, rented, total: props.length });
        setRevenueStats(computeRevenue(props));
      }
    } catch (err) {
      console.error("Error fetching insights data:", err);
    } finally {
      setLoadingData(false);
    }
  };

  const formatAmount = (amount: number) =>
    formatRevenue(amount, revenueStats.currency, i18n.language);

  const barData = [
    {
      name: t("insights.barActive"),
      count: propertyStats.active,
      fill: "hsl(var(--primary))",
    },
    {
      name: t("insights.barSold"),
      count: propertyStats.sold,
      fill: "hsl(var(--accent))",
    },
    {
      name: t("insights.barRented"),
      count: propertyStats.rented,
      fill: "hsl(var(--muted-foreground))",
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <DashboardSidebar
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-background border-b border-border px-4 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-foreground"
              aria-label="menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-display text-xl lg:text-2xl font-bold text-foreground">
              {t("insights.heading")}
            </h1>
          </div>
        </header>

        <div className="p-4 lg:p-8 space-y-8">
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                <CardTitle className="font-display text-lg">
                  {t("insights.packageUsageTitle")}
                </CardTitle>
              </div>
              <CardDescription>
                {t("insights.packageUsageDescription", {
                  plan: planLabels[plan],
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {planLimit === Infinity ? (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <p className="text-foreground font-medium">
                    {t("insights.unlimitedListings", { count: usedSlots })}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      <Trans
                        i18nKey="insights.listingsUsed"
                        t={t}
                        values={{ used: usedSlots, limit: planLimit }}
                        components={{
                          strong: (
                            <span className="font-semibold text-foreground" />
                          ),
                        }}
                      />
                    </span>
                    <span className="text-muted-foreground">
                      {t("insights.listingsRemaining", {
                        count: planLimit - usedSlots,
                      })}
                    </span>
                  </div>
                  <Progress value={usagePercent} className="h-3" />
                  {usagePercent >= 80 && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
                      <Info className="w-4 h-4 shrink-0" />
                      <span>{t("insights.approachingLimit")}</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <div>
            <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              {t("insights.propertyStatusHeading")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("insights.activeListings")}
                      </p>
                      <p className="text-3xl font-display font-bold text-foreground mt-1">
                        {loadingData ? "—" : propertyStats.active}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("insights.soldProperties")}
                      </p>
                      <p className="text-3xl font-display font-bold text-foreground mt-1">
                        {loadingData ? "—" : propertyStats.sold}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("insights.rentedProperties")}
                      </p>
                      <p className="text-3xl font-display font-bold text-foreground mt-1">
                        {loadingData ? "—" : propertyStats.rented}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Key className="w-5 h-5 text-accent" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {!loadingData && propertyStats.total > 0 && (
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={barData} barSize={40}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="name"
                        tick={{
                          fill: "hsl(var(--muted-foreground))",
                          fontSize: 12,
                        }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{
                          fill: "hsl(var(--muted-foreground))",
                          fontSize: 12,
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {barData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              {t("insights.revenueHeading")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("insights.totalRevenue")}
                      </p>
                      <p className="text-2xl sm:text-3xl font-display font-bold text-foreground mt-1">
                        {loadingData ? "—" : formatAmount(revenueStats.total)}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("insights.sellingRevenue")}
                      </p>
                      <p className="text-2xl sm:text-3xl font-display font-bold text-foreground mt-1">
                        {loadingData ? "—" : formatAmount(revenueStats.selling)}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("insights.rentingRevenue")}
                      </p>
                      <p className="text-2xl sm:text-3xl font-display font-bold text-foreground mt-1">
                        {loadingData ? "—" : formatAmount(revenueStats.renting)}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Key className="w-5 h-5 text-accent" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
