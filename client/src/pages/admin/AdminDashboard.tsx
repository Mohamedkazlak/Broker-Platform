import { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  UserCog,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  adminService,
  type AdminDashboardStats,
} from "@/services/adminService";

interface StatCard {
  label: string;
  value: string;
  icon: LucideIcon;
}

export default function AdminDashboard() {
  const { t } = useTranslation("admin");
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminService.getDashboardStats();
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dash = (n: number | undefined) =>
    isLoading || n === undefined ? "—" : n.toLocaleString();

  const cards: StatCard[] = [
    {
      label: t("dashboard.totalBrokers"),
      value: dash(stats?.totalBrokers),
      icon: Users,
    },
    {
      label: t("dashboard.activeBrokers"),
      value: dash(stats?.activeBrokers),
      icon: UserCheck,
    },
    {
      label: t("dashboard.pendingBrokers"),
      value: dash(stats?.pendingBrokers),
      icon: UserCog,
    },
    {
      label: t("dashboard.newThisMonth"),
      value: dash(stats?.newBrokersThisMonth),
      icon: UserPlus,
    },
    {
      label: t("dashboard.pendingInstapayReviews"),
      // TODO: wire to real Instapay queue count (Prompt: Payments section)
      value: "0",
      icon: Wallet,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-xl lg:text-2xl font-bold text-foreground">
          {t("dashboard.heading")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("dashboard.subheading")}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {t("dashboard.loadError")}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6">
        {cards.map((stat) => (
          <div
            key={stat.label}
            className="bg-card rounded-xl border border-border p-6 shadow-card"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl lg:text-3xl font-display font-bold text-foreground mt-1">
                  {stat.value}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
