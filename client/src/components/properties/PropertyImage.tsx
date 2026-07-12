import { useState } from "react";
import { ImageOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toDisplayImageUrl } from "@/utils/propertyImageLinks";
import { cn } from "@/lib/utils";

interface PropertyImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  /** Wrapper classes when showing the unavailable placeholder */
  unavailableClassName?: string;
  /** Used only when there is no src at all (e.g. listing with no photos). */
  emptyFallbackSrc?: string;
  /** Compact label for thumbnails */
  compact?: boolean;
}

/**
 * Renders a property photo. Broken / unshared links show an "unavailable"
 * placeholder instead of breaking the surrounding layout.
 */
export function PropertyImage({
  src,
  alt,
  className,
  unavailableClassName,
  emptyFallbackSrc,
  compact = false,
}: PropertyImageProps) {
  const { t } = useTranslation("property");
  const hasSrc = Boolean(src?.trim());
  const displaySrc = hasSrc
    ? toDisplayImageUrl(src)
    : (emptyFallbackSrc ?? null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = Boolean(displaySrc && failedSrc === displaySrc);

  if (!displaySrc || failed) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 bg-muted text-muted-foreground",
          unavailableClassName ?? className,
        )}
        role="img"
        aria-label={t("listing.imageUnavailable")}
      >
        <ImageOff className={compact ? "w-4 h-4" : "w-8 h-8 opacity-70"} />
        {!compact && (
          <span className="text-xs sm:text-sm px-2 text-center">
            {t("listing.imageUnavailable")}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      onError={() => setFailedSrc(displaySrc)}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
}
