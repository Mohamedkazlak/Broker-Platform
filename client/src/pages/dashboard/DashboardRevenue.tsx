import { useEffect, useMemo, useState } from "react";
import {
  Menu,
  DollarSign,
  Key,
  TrendingUp,
  Wallet,
  CalendarDays,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Property } from "@/components/properties/PropertyCard";
import { propertyService } from "@/services/propertyService";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import {
  computeMonthlyRevenue,
  computeMonthlyRevenueSeries,
  computeRevenue,
  formatRevenue,
  listClosedDeals,
} from "@/utils/formatRevenue";

export default function DashboardRevenue() {
  const { profile, isLoading } = useAuth();
  const { t, i18n } = useTranslation("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!profile?.broker_id) return;
    let cancelled = false;
    (async () => {
      setLoadingData(true);
      try {
        const propsRes = await propertyService.getAll({
          broker_id: profile.broker_id,
          limit: 100,
        });
        if (cancelled) return;
        setProperties(Array.isArray(propsRes) ? propsRes : []);
      } catch (err) {
        console.error("Error fetching revenue data:", err);
        if (!cancelled) setProperties([]);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.broker_id]);

  const lifetime = useMemo(() => computeRevenue(properties), [properties]);
  const thisMonth = useMemo(
    () => computeMonthlyRevenue(properties),
    [properties],
  );
  const series = useMemo(
    () => computeMonthlyRevenueSeries(properties, 12),
    [properties],
  );
  const deals = useMemo(() => listClosedDeals(properties), [properties]);

  const currency = thisMonth.currency || lifetime.currency;

  const formatAmount = (amount: number) =>
    formatRevenue(amount, currency, i18n.language);

  const formatMonthLabel = (year: number, monthIndex: number) =>
    new Intl.DateTimeFormat(i18n.language === "ar" ? "ar-EG" : "en-US", {
      month: "short",
      year: "2-digit",
    }).format(new Date(year, monthIndex, 1));

  const formatDealDate = (property: Property) => {
    const raw = property.closed_at || property.updated_at;
    if (!raw) return "—";
    return new Intl.DateTimeFormat(i18n.language === "ar" ? "ar-EG" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(raw));
  };

  const chartData = series.map((point) => ({
    name: formatMonthLabel(point.year, point.month),
    selling: point.selling,
    renting: point.renting,
  }));

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
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-foreground"
                aria-label="menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-display text-xl lg:text-2xl font-bold text-foreground">
                  {t("revenue.heading")}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t("revenue.subheading")}
                </p>
              </div>
            </div>
            <LanguageSwitcher variant="outline" />
          </div>
        </header>

        <div className="p-4 lg:p-8 space-y-8">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              {t("revenue.thisMonthHeading")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("revenue.thisMonthTotal")}
                      </p>
                      <p className="text-2xl sm:text-3xl font-display font-bold text-foreground mt-1 tabular-nums">
                        {loadingData ? "—" : formatAmount(thisMonth.total)}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("revenue.thisMonthSales")}
                      </p>
                      <p className="text-2xl sm:text-3xl font-display font-bold text-foreground mt-1 tabular-nums">
                        {loadingData ? "—" : formatAmount(thisMonth.selling)}
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
                        {t("revenue.thisMonthRent")}
                      </p>
                      <p className="text-2xl sm:text-3xl font-display font-bold text-foreground mt-1 tabular-nums">
                        {loadingData ? "—" : formatAmount(thisMonth.renting)}
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

          <div>
            <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              {t("revenue.lifetimeHeading")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    {t("revenue.lifetimeTotal")}
                  </p>
                  <p className="text-2xl font-display font-bold text-foreground mt-1 tabular-nums">
                    {loadingData ? "—" : formatAmount(lifetime.total)}
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    {t("revenue.lifetimeSales")}
                  </p>
                  <p className="text-2xl font-display font-bold text-foreground mt-1 tabular-nums">
                    {loadingData ? "—" : formatAmount(lifetime.selling)}
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    {t("revenue.lifetimeRent")}
                  </p>
                  <p className="text-2xl font-display font-bold text-foreground mt-1 tabular-nums">
                    {loadingData ? "—" : formatAmount(lifetime.renting)}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-lg">
                {t("revenue.chartHeading")}
              </CardTitle>
              <CardDescription>{t("revenue.chartDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                  —
                </div>
              ) : deals.length === 0 ? (
                <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                  {t("revenue.empty")}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} barGap={4}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 11,
                      }}
                    />
                    <YAxis
                      tick={{
                        fill: "hsl(var(--muted-foreground))",
                        fontSize: 11,
                      }}
                      tickFormatter={(value) =>
                        value >= 1000
                          ? `${Math.round(value / 1000)}k`
                          : String(value)
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number, name: string) => [
                        formatAmount(value),
                        name === "selling"
                          ? t("revenue.chartSales")
                          : t("revenue.chartRent"),
                      ]}
                    />
                    <Legend
                      formatter={(value) =>
                        value === "selling"
                          ? t("revenue.chartSales")
                          : t("revenue.chartRent")
                      }
                    />
                    <Bar
                      dataKey="selling"
                      name="selling"
                      stackId="revenue"
                      fill="hsl(var(--primary))"
                    />
                    <Bar
                      dataKey="renting"
                      name="renting"
                      stackId="revenue"
                      fill="hsl(var(--accent))"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-lg">
                {t("revenue.dealsHeading")}
              </CardTitle>
              <CardDescription>
                {t("revenue.dealsDescription", { count: deals.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <p className="text-muted-foreground text-sm">—</p>
              ) : deals.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t("revenue.empty")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-start">
                        <th className="py-3 pe-4 font-medium text-start">
                          {t("revenue.table.property")}
                        </th>
                        <th className="py-3 pe-4 font-medium text-start">
                          {t("revenue.table.status")}
                        </th>
                        <th className="py-3 pe-4 font-medium text-start">
                          {t("revenue.table.amount")}
                        </th>
                        <th className="py-3 font-medium text-start">
                          {t("revenue.table.closed")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {deals.map((deal) => (
                        <tr
                          key={deal.id}
                          className="border-b border-border/60 last:border-0"
                        >
                          <td className="py-3 pe-4">
                            <div className="font-medium text-foreground">
                              {deal.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {[deal.city, deal.location]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </div>
                          </td>
                          <td className="py-3 pe-4">
                            <Badge
                              variant={
                                deal.status === "sold" ? "default" : "secondary"
                              }
                            >
                              {deal.status === "sold"
                                ? t("revenue.statusSold")
                                : t("revenue.statusRented")}
                            </Badge>
                          </td>
                          <td className="py-3 pe-4 font-medium text-foreground whitespace-nowrap tabular-nums">
                            {formatAmount(Number(deal.price) || 0)}
                            {deal.status === "rented" ? (
                              <span className="text-muted-foreground font-normal">
                                {t("revenue.perMonth")}
                              </span>
                            ) : null}
                          </td>
                          <td className="py-3 text-muted-foreground whitespace-nowrap">
                            {formatDealDate(deal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
