import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Plus,
  Menu,
} from "lucide-react";
import { useTranslation, Trans } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { PropertyImage } from "@/components/properties/PropertyImage";
import { Property } from "@/components/properties/PropertyCard";
import { propertyService } from "@/services/propertyService";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

export default function DashboardProperties() {
  const { profile, isLoading } = useAuth();
  const { t, i18n } = useTranslation("dashboard");
  const [properties, setProperties] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchProperties = async () => {
    if (!profile?.broker_id) return;
    try {
      const data = await propertyService.getAll({
        broker_id: profile.broker_id,
      });
      setProperties(Array.isArray(data) ? data : []);
    } catch {
      setProperties([]);
    }
  };

  useEffect(() => {
    fetchProperties();
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
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      },
    ).format(price);
    return type === "rent" ? `${formatted}/mo` : formatted;
  };

  const filteredProperties = properties.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || p.property_type === filterType;
    return matchesSearch && matchesType;
  });

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
                {t("properties.heading")}
              </h1>
            </div>
            <Button variant="default" asChild>
              <Link to="/dashboard/properties/new">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {t("overview.addProperty")}
                </span>
              </Link>
            </Button>
          </div>
        </header>

        <div className="p-4 lg:p-8 space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("properties.filters.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-9"
              />
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue
                  placeholder={t("properties.filters.typePlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("properties.filters.allProperties")}
                </SelectItem>
                <SelectItem value="rent">
                  {t("properties.filters.forRent")}
                </SelectItem>
                <SelectItem value="sale">
                  {t("properties.filters.forSale")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Properties Table */}
          <div className="bg-card rounded-xl border border-border shadow-card">
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
                    <th className="text-start text-sm font-medium text-muted-foreground px-4 lg:px-6 py-3 hidden sm:table-cell">
                      {t("overview.table.beds")}
                    </th>
                    <th className="text-start text-sm font-medium text-muted-foreground px-4 lg:px-6 py-3 hidden lg:table-cell">
                      {t("overview.table.area")}
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
                              {property.city ? `, ${property.city}` : ""}
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
                            ? t("properties.filters.forRent")
                            : t("properties.filters.forSale")}
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
                      <td className="px-4 lg:px-6 py-4 hidden sm:table-cell text-muted-foreground">
                        {property.bedrooms ?? "-"}
                      </td>
                      <td className="px-4 lg:px-6 py-4 hidden lg:table-cell text-muted-foreground">
                        {property.area_sqft
                          ? `${property.area_sqft.toLocaleString()} sqft`
                          : "-"}
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
                                  await fetchProperties();
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
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  {t("properties.noResults")}
                </p>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            <Trans
              i18nKey="properties.showingCount"
              t={t}
              values={{
                shown: filteredProperties.length,
                total: properties.length,
              }}
            />
          </p>
        </div>
      </main>
    </div>
  );
}
