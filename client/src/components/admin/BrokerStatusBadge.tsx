import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { BrokerStatus } from "@/services/adminService";

/** Tailwind classes per derived broker status (matches broker dashboard palette). */
const STATUS_CLASSES: Record<string, string> = {
  active: "border-green-500 text-green-600",
  pending: "border-yellow-500 text-yellow-600",
  suspended: "border-destructive text-destructive",
  past_due: "border-orange-500 text-orange-600",
};

export function BrokerStatusBadge({ status }: { status: BrokerStatus }) {
  const { t } = useTranslation("admin");
  const cls = STATUS_CLASSES[status] ?? "border-border text-muted-foreground";

  return (
    <Badge variant="outline" className={cls}>
      {t(`status.${status}`, { defaultValue: status })}
    </Badge>
  );
}

export default BrokerStatusBadge;
