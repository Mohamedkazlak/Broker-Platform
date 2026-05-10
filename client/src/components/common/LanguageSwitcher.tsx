import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@/i18n";

interface LanguageSwitcherProps {
  className?: string;
  variant?: "ghost" | "outline";
}

/**
 * Swaps the language segment of the current URL (e.g. /en/dashboard → /ar/dashboard)
 * and triggers a full reload so i18n, HTML dir/lang, and router basename are re-applied.
 */
export function LanguageSwitcher({
  className,
  variant = "ghost",
}: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation("common");

  const switchTo = (next: SupportedLanguage) => {
    const segments = window.location.pathname.split("/");
    if ((SUPPORTED_LANGUAGES as readonly string[]).includes(segments[1])) {
      segments[1] = next;
    } else {
      segments.splice(1, 0, next);
    }
    const newPath = segments.join("/") || `/${next}`;
    try {
      window.localStorage.setItem("i18nextLng", next);
    } catch {
      /* ignore */
    }
    window.location.href = `${newPath}${window.location.search}${window.location.hash}`;
  };

  const currentLabel =
    i18n.language === "ar"
      ? t("language.arabic")
      : t("language.english");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          className={className}
          aria-label={t("language.switcher")}
        >
          <Globe className="w-4 h-4" />
          <span className="font-medium">{currentLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => switchTo("en")}>
          {t("language.english")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchTo("ar")}>
          {t("language.arabic")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LanguageSwitcher;
