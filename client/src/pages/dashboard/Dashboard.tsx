import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Home,
  Building2,
  DollarSign,
  MapPin,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Menu,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Property } from "@/components/properties/PropertyCard";
import { PropertyImage } from "@/components/properties/PropertyImage";
import { propertyService } from "@/services/propertyService";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import {
  computeMonthlyRevenue,
  countActiveCities,
  formatRevenue,
} from "@/utils/formatRevenue";

export default function Dashboard() {
  const { profile, isLoading } = useAuth();
  const { t, i18n } = useTranslation("dashboard");
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeCount = properties.filter((p) => p.status === "active").length;
  const totalCount = properties.length;
  const activePct =
    totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;
  const activeCities = countActiveCities(properties);
  const monthlyRevenue = computeMonthlyRevenue(properties);

  const stats = [
    {
      label: t("overview.stats.totalProperties"),
      value: totalCount.toString(),
      icon: Building2,
      change: t("overview.stats.totalPropertiesChange", { count: totalCount }),
    },
    {
      label: t("overview.stats.activeListings"),
      value: activeCount.toString(),
      icon: Home,
      change: t("overview.stats.activeListingsChange", { percent: activePct }),
    },
    {
      label: t("overview.stats.activeCities"),
      value: activeCities.toString(),
      icon: MapPin,
      change: t("overview.stats.activeCitiesChange", { count: activeCities }),
    },
    {
      label: t("overview.stats.monthlyRevenue"),
      value: formatRevenue(
        monthlyRevenue.total,
        monthlyRevenue.currency,
        i18n.language,
      ),
      icon: DollarSign,
      change: t("overview.stats.monthlyRevenueChange"),
    },
  ];

  useEffect(() => {
    if (!profile?.broker_id) return;
    let cancelled = false;
    (async () => {
      try {
        const propsRes = await propertyService.getAll({
          broker_id: profile.broker_id,
        });
        if (cancelled) return;
        setProperties(Array.isArray(propsRes) ? propsRes : []);
      } catch (e) {
        if (!cancelled) setProperties([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.broker_id]);

  const formatPrice = (
    price: number,
    currency: string,
    type: "rent" | "sale",
  ) => {
    const formatted = new Intl.NumberFormat(
      i18n.language === "ar" ? "ar-EG" : "en-US",
      {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      },
    ).format(price);
    return type === "rent" ? `${formatted}/mo` : formatted;
  };

  const filteredProperties = properties.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
        {/* Header */}
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
              <h1 className="font-display text-xl lg:text-2xl font-bold text-foreground">
                {t("overview.heading")}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="default" asChild>
                <Link to="/dashboard/properties/new">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {t("overview.addProperty")}
                  </span>
                </Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 lg:p-8 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-card rounded-xl border border-border p-6 shadow-card"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="text-2xl lg:text-3xl font-display font-bold text-foreground mt-1">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.change}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Properties Table */}
          <div className="bg-card rounded-xl border border-border shadow-card">
            <div className="p-4 lg:p-6 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  {t("overview.recentPropertiesHeading")}
                </h2>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={t("overview.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="ps-9"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-start text-sm font-medium text-muted-foreground px-4 lg:px-6 py-3">
                      {t("overview.table.property")}
                    </th>
                    <th className="text-start text-sm font-medium text-muted-foreground px-4 lg:px-6 py-3 hidden md:table-cell">
                      {t("overview.table.type")}
                    </th>
                    <th className="text-start text-sm font-medium text-muted-foreground px-4 lg:px-6 py-3">
                      {t("overview.table.price")}
                    </th>
                    <th className="text-start text-sm font-medium text-muted-foreground px-4 lg:px-6 py-3 hidden lg:table-cell">
                      {t("overview.table.status")}
                    </th>
                    <th className="text-end text-sm font-medium text-muted-foreground px-4 lg:px-6 py-3">
                      {t("overview.table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredProperties.map((property) => (
                    <tr
                      key={property.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 lg:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <PropertyImage
                            src={property.image_url}
                            alt={property.title}
                            className="w-12 h-12 rounded-lg object-cover"
                            unavailableClassName="w-12 h-12 rounded-lg"
                            compact
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {property.title}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {property.location}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 hidden md:table-cell">
                        <Badge
                          variant={
                            property.property_type === "rent"
                              ? "secondary"
                              : "default"
                          }
                        >
                          {property.property_type === "rent"
                            ? t("overview.statusForRent")
                            : t("overview.statusForSale")}
                        </Badge>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <span className="font-medium text-foreground">
                          {formatPrice(
                            property.price,
                            property.currency,
                            property.property_type,
                          )}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4 hidden lg:table-cell">
                        <Badge
                          variant="outline"
                          className={
                            property.status === "active"
                              ? "border-green-500 text-green-600"
                              : "border-yellow-500 text-yellow-600"
                          }
                        >
                          {property.status}
                        </Badge>
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/properties/${property.id}`}>
                                <Eye className="w-4 h-4 me-2" />
                                {t("overview.rowActions.view")}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link
                                to={`/dashboard/properties/edit/${property.id}`}
                              >
                                <Edit className="w-4 h-4 me-2" />
                                {t("overview.rowActions.edit")}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={async () => {
                                if (
                                  !window.confirm(
                                    t("overview.rowActions.deleteConfirm", {
                                      title: property.title,
                                    }),
                                  )
                                )
                                  return;
                                try {
                                  await propertyService.delete(property.id);
                                  setProperties((prev) =>
                                    prev.filter((p) => p.id !== property.id),
                                  );
                                } catch (e) {
                                  console.error(e);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 me-2" />
                              {t("overview.rowActions.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredProperties.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {t("overview.table.noResults")}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
