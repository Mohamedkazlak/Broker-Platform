import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EGYPT_GOVERNORATES } from "@/constants/governorates";
import { cn } from "@/lib/utils";

interface GovernorateSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
}

export function GovernorateSelect({
  id,
  value,
  onChange,
  placeholder,
  className,
  error,
}: GovernorateSelectProps) {
  const { t } = useTranslation("governorates");

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger
        id={id}
        className={cn(error && "border-destructive", className)}
      >
        <SelectValue placeholder={placeholder ?? t("placeholder")} />
      </SelectTrigger>
      <SelectContent>
        {EGYPT_GOVERNORATES.map((slug) => (
          <SelectItem key={slug} value={slug}>
            {t(slug)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
