import { useState } from "react";
import { Film, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  buildVideoEmbedSrc,
  parsePropertyVideoLink,
} from "@/utils/propertyVideoLinks";
import { cn } from "@/lib/utils";

interface PropertyVideoProps {
  src?: string | null;
  className?: string;
  /** Wrapper classes when showing the unavailable placeholder */
  unavailableClassName?: string;
  /** Thumbnail: poster + play overlay, never an iframe */
  compact?: boolean;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
}

function Unavailable({
  compact,
  className,
}: {
  compact: boolean;
  className?: string;
}) {
  const { t } = useTranslation("property");
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 bg-muted text-muted-foreground",
        className,
      )}
      role="img"
      aria-label={t("listing.videoUnavailable")}
    >
      <Film className={compact ? "w-4 h-4" : "w-8 h-8 opacity-70"} />
      {!compact && (
        <span className="text-xs sm:text-sm px-2 text-center">
          {t("listing.videoUnavailable")}
        </span>
      )}
    </div>
  );
}

function PlayOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/65 text-white shadow-md">
        <Play className="h-5 w-5 fill-current ms-0.5" />
      </span>
    </div>
  );
}

/**
 * Renders a property video. YouTube / Vimeo / Drive links are embedded;
 * direct files and local blob previews use a video element. Broken sources
 * show an unavailable placeholder instead of a native "corrupted file" icon.
 */
export function PropertyVideo({
  src,
  className,
  unavailableClassName,
  compact = false,
  controls = false,
  autoPlay = false,
  muted = true,
  loop = false,
  playsInline = true,
}: PropertyVideoProps) {
  const { t } = useTranslation("property");
  const parsed = src?.trim() ? parsePropertyVideoLink(src) : null;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [thumbFailedSrc, setThumbFailedSrc] = useState<string | null>(null);
  const failed = Boolean(src && failedSrc === src);
  const thumbFailed = Boolean(src && thumbFailedSrc === src);

  if (!parsed || !parsed.ok || failed) {
    return (
      <Unavailable
        compact={compact}
        className={unavailableClassName ?? className}
      />
    );
  }

  if (parsed.kind !== "file") {
    if (compact) {
      return (
        <div
          className={cn(
            "relative h-full w-full overflow-hidden bg-muted",
            className,
          )}
        >
          {parsed.thumbnailUrl && !thumbFailed ? (
            <img
              src={parsed.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover pointer-events-none"
              onError={() => setThumbFailedSrc(src ?? null)}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-muted to-muted-foreground/20" />
          )}
          <PlayOverlay />
        </div>
      );
    }

    const embedSrc = buildVideoEmbedSrc(parsed, { autoPlay, muted });
    return (
      <iframe
        src={embedSrc}
        title={t("listing.videoPlayer")}
        className={cn("h-full w-full border-0", className)}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }

  return (
    <div
      className={cn(
        "relative h-full w-full",
        compact ? "overflow-hidden bg-muted" : "bg-black",
        className,
      )}
    >
      <video
        src={parsed.playbackUrl}
        className={cn(
          "h-full w-full",
          compact ? "object-cover pointer-events-none" : "object-contain",
        )}
        controls={controls && !compact}
        autoPlay={autoPlay && !compact}
        muted={muted}
        loop={loop}
        playsInline={playsInline}
        preload={compact ? "metadata" : "auto"}
        onError={() => setFailedSrc(src ?? null)}
      />
      {compact && <PlayOverlay />}
    </div>
  );
}
