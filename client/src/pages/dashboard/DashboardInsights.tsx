import { useState, useEffect } from "react";
import {
  Building2,
  Menu,
  Package,
  CheckCircle2,
  DollarSign,
  Key,
  Eye,
  Info,
} from "lucide-react";
import {
  LineChart,
  Line,
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
import { analyticsService } from "@/services/analyticsService";
import { format } from "date-fns";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

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

export default function DashboardInsights() {
  const { profile, isLoading } = useAuth();
  const { t } = useTranslation("dashboard");
  const { t: tPricing } = useTranslation("pricing");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [propertyStats, setPropertyStats] = useState<PropertyStats>({
    active: 0,
    sold: 0,
    rented: 0,
    total: 0,
  });
  const [loadingData, setLoadingData] = useState(true);
  const [topProperties, setTopProperties] = useState<
    { title: string; views: number }[]
  >([]);
  const [viewsData, setViewsData] = useState<{ day: string; views: number }[]>(
    [],
  );
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
      const [brokerRes, propertiesRes, viewsRes, topRes] = await Promise.all([
        supabase
          .from("brokers")
          .select("package")
          .eq("id", profile!.broker_id)
          .single(),
        supabase
          .from("properties")
          .select("id, title, status")
          .eq("broker_id", profile!.broker_id),
        analyticsService.getViews(31).catch(() => ({ data: [], total: 0 })),
        analyticsService.getTopProperties(5, 30).catch(() => []),
      ]);

      if (brokerRes.data) {
        setAdminPackage(brokerRes.data.package);
      }

      const brokerProperties = propertiesRes.data ?? [];
      const titleById = new Map(brokerProperties.map((p) => [p.id, p.title]));

      if (propertiesRes.data) {
        const props = propertiesRes.data;
        const active = props.filter((p) => p.status === "active").length;
        const sold = props.filter((p) => p.status === "sold").length;
        const rented = props.filter((p) => p.status === "rented").length;
        setPropertyStats({ active, sold, rented, total: props.length });
      }

      if (viewsRes.data && Array.isArray(viewsRes.data)) {
        const rows = viewsRes.data as {
          day?: string;
          views?: number;
          viewed_at?: string;
        }[];
        const first = rows[0];
        if (
          first &&
          first.day != null &&
          typeof first.views === "number" &&
          first.viewed_at == null
        ) {
          setViewsData(
            rows.map((row) => ({
              day: format(new Date(row.day!), "d"),
              views: row.views ?? 0,
            })),
          );
        } else {
          const byDay: Record<string, number> = {};
          rows.forEach((row) => {
            const day = row.viewed_at
              ? format(new Date(row.viewed_at), "d")
              : "";
            if (day) byDay[day] = (byDay[day] || 0) + 1;
          });
          setViewsData(
            Object.entries(byDay)
              .map(([day, views]) => ({ day, views }))
              .sort((a, b) => Number(a.day) - Number(b.day)),
          );
        }
      }

      if (topRes.length > 0) {
        // Titles already came back with the broker's property list above, so we
        // resolve them in memory instead of firing one HTTP request per row.
        setTopProperties(
          topRes.map((row) => ({
            title:
              titleById.get(row.property_id) ?? `Property ${row.property_id}`,
            views: row.views,
          })),
        );
      } else {
        setTopProperties([]);
      }
    } catch (err) {
      console.error("Error fetching insights data:", err);
    } finally {
      setLoadingData(false);
    }
  };

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

      {/* Main Content */}
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
          {/* ── Section A: Package Usage ── */}
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

          {/* ── Section B: Property Status Breakdown ── */}
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

            {/* Bar chart */}
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

          {/* ── Section D: Website Views & Most Watched ── */}
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-primary" />
              {t("insights.viewsHeading")}
            </h2>

            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 shadow-card">
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart
                      data={
                        viewsData.length > 0
                          ? viewsData
                          : [{ day: "1", views: 0 }]
                      }
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="day"
                        tick={{
                          fill: "hsl(var(--muted-foreground))",
                          fontSize: 11,
                        }}
                        interval={Math.max(0, Math.floor(viewsData.length / 6))}
                      />
                      <YAxis
                        tick={{
                          fill: "hsl(var(--muted-foreground))",
                          fontSize: 11,
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                        labelFormatter={(v) =>
                          t("insights.dayLabel", { day: v })
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="views"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-display">
                    {t("insights.mostViewedTitle")}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t("insights.mostViewedSubtitle")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {topProperties.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t("insights.noProperties")}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {topProperties.map((prop, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">
                            #{i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {prop.title}
                            </p>
                            <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{
                                  width: `${Math.round((prop.views / topProperties[0].views) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {prop.views}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
