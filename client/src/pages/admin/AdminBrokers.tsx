import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BrokerStatusBadge } from "@/components/admin/BrokerStatusBadge";
import {
  adminService,
  type BrokerSummary,
  type Pagination,
} from "@/services/adminService";

const STATUS_OPTIONS = ["all", "active", "pending", "suspended", "past_due"];
const PAGE_SIZE = 20;

export default function AdminBrokers() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("admin");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const [brokers, setBrokers] = useState<BrokerSummary[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Debounce the search input to avoid a request on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(false);
    (async () => {
      try {
        const { brokers: rows, pagination: pg } =
          await adminService.listBrokers({
            search: debouncedSearch || undefined,
            status: status === "all" ? undefined : status,
            page,
            limit: PAGE_SIZE,
          });
        if (cancelled) return;
        setBrokers(rows);
        setPagination(pg);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, status, page]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(
      i18n.language === "ar" ? "ar-EG" : "en-US",
      { year: "numeric", month: "short", day: "numeric" },
    );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-xl lg:text-2xl font-bold text-foreground">
          {t("brokers.heading")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("brokers.subheading")}</p>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card">
        {/* Filters */}
        <div className="p-4 lg:p-6 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("brokers.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
              />
            </div>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {t(`brokers.statusFilter.${opt}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-start text-sm font-medium text-muted-foreground px-4 lg:px-6 py-3">
                  {t("brokers.table.name")}
                </th>
                <th className="text-start text-sm font-medium text-muted-foreground px-4 lg:px-6 py-3 hidden md:table-cell">
                  {t("brokers.table.email")}
                </th>
                <th className="text-start text-sm font-medium text-muted-foreground px-4 lg:px-6 py-3 hidden lg:table-cell">
                  {t("brokers.table.domain")}
                </th>
                <th className="text-start text-sm font-medium text-muted-foreground px-4 lg:px-6 py-3 hidden sm:table-cell">
                  {t("brokers.table.plan")}
                </th>
                <th className="text-start text-sm font-medium text-muted-foreground px-4 lg:px-6 py-3">
                  {t("brokers.table.status")}
                </th>
                <th className="text-start text-sm font-medium text-muted-foreground px-4 lg:px-6 py-3 hidden lg:table-cell">
                  {t("brokers.table.signupDate")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {brokers.map((broker) => (
                <tr
                  key={broker.id}
                  onClick={() => navigate(`/admin/brokers/${broker.id}`)}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <td className="px-4 lg:px-6 py-4">
                    <p className="font-medium text-foreground truncate">
                      {broker.name}
                    </p>
                    {broker.contactName && (
                      <p className="text-sm text-muted-foreground truncate">
                        {broker.contactName}
                      </p>
                    )}
                  </td>
                  <td className="px-4 lg:px-6 py-4 hidden md:table-cell text-sm text-muted-foreground">
                    {broker.email}
                  </td>
                  <td className="px-4 lg:px-6 py-4 hidden lg:table-cell text-sm text-muted-foreground">
                    {broker.customDomain || `${broker.subdomain}`}
                  </td>
                  <td className="px-4 lg:px-6 py-4 hidden sm:table-cell">
                    <span className="text-sm font-medium capitalize text-foreground">
                      {broker.plan}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <BrokerStatusBadge status={broker.status} />
                  </td>
                  <td className="px-4 lg:px-6 py-4 hidden lg:table-cell text-sm text-muted-foreground">
                    {formatDate(broker.signupDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && error && (
          <div className="text-center py-12 text-sm text-destructive">
            {t("brokers.loadError")}
          </div>
        )}

        {!isLoading && !error && brokers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t("brokers.empty")}</p>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total > 0 && (
          <div className="flex items-center justify-between gap-4 p-4 lg:p-6 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {t("brokers.pagination.summary", {
                page: pagination.page,
                totalPages: pagination.totalPages,
                total: pagination.total,
              })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                {t("brokers.pagination.prev")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages || isLoading}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("brokers.pagination.next")}
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
