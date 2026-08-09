import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  Search,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  translatedBuildingType,
  translatedGovernorate,
} from "@/utils/propertyLabels";
import { EGYPT_GOVERNORATES } from "@/constants/governorates";
import {
  BATH_OPTIONS,
  BED_OPTIONS,
  BUILDING_TYPE_OPTIONS,
  ListingType,
  PropertyFilterState,
} from "@/lib/propertyFilters";
import { cn } from "@/lib/utils";

type PanelId = "city" | "building" | "beds" | "price" | "area" | "listing";

const pillClass =
  "inline-flex h-10 items-center gap-2 rounded-full border border-[#d0d5dd] bg-white px-4 text-sm font-medium text-[#344054] shadow-sm transition-colors hover:bg-gray-50 shrink-0";

const activePillClass = "border-primary text-primary";
const listingPillClass = "border-primary/30 bg-primary/15 text-primary";

interface PropertySearchFiltersProps {
  value: PropertyFilterState;
  onChange: (next: PropertyFilterState) => void;
  onSubmit?: () => void;
  variant?: "hero" | "page";
  /** Single-row sticky bar used while scrolling the properties page. */
  compact?: boolean;
  className?: string;
  trailing?: ReactNode;
}

interface PanelCoords {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

function FilterPill({
  label,
  active,
  open,
  onClick,
  panelId,
  buttonRef,
  className,
}: {
  label: string;
  active: boolean;
  open: boolean;
  onClick: () => void;
  panelId: string;
  buttonRef: (node: HTMLButtonElement | null) => void;
  className?: string;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-expanded={open}
      aria-controls={panelId}
      onClick={onClick}
      className={cn(pillClass, (active || open) && activePillClass, className)}
    >
      <span className="truncate max-w-[10rem]">{label}</span>
      {open ? (
        <ChevronUp className="h-4 w-4 shrink-0 opacity-70" />
      ) : (
        <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
      )}
    </button>
  );
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-[#d0d5dd] bg-white text-[#344054] hover:border-primary/50",
      )}
    >
      {children}
    </button>
  );
}

function CircleChoice({
  selected,
  onClick,
  children,
  wide,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-full border text-sm font-medium transition-colors",
        wide ? "min-w-[4.5rem] px-3" : "w-10",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-[#d0d5dd] bg-white text-[#344054] hover:border-primary/50",
      )}
    >
      {children}
    </button>
  );
}

function RangeInputs({
  min,
  max,
  minPlaceholder,
  maxPlaceholder,
  onMinChange,
  onMaxChange,
}: {
  min: string;
  max: string;
  minPlaceholder: string;
  maxPlaceholder: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        placeholder={minPlaceholder}
        value={min}
        onChange={(e) => onMinChange(e.target.value.replace(/[^\d]/g, ""))}
        className="h-11 rounded-lg border-[#d0d5dd]"
      />
      <span className="text-muted-foreground shrink-0">—</span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        placeholder={maxPlaceholder}
        value={max}
        onChange={(e) => onMaxChange(e.target.value.replace(/[^\d]/g, ""))}
        className="h-11 rounded-lg border-[#d0d5dd]"
      />
    </div>
  );
}

function FilterPanelPortal({
  open,
  anchor,
  panelRef,
  id,
  preferredWidth,
  children,
}: {
  open: boolean;
  anchor: HTMLButtonElement | null;
  panelRef: (node: HTMLDivElement | null) => void;
  id: string;
  preferredWidth: number;
  children: ReactNode;
}) {
  const [coords, setCoords] = useState<PanelCoords | null>(null);
  const [placement, setPlacement] = useState<"below" | "above">("below");
  const innerRef = useRef<HTMLDivElement | null>(null);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      innerRef.current = node;
      panelRef(node);
    },
    [panelRef],
  );

  const updatePosition = useCallback(() => {
    if (!open || !anchor) {
      setCoords(null);
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const gap = 8;
    const maxWidth = Math.min(preferredWidth, window.innerWidth - 16);

    let left = rect.left;
    if (left + maxWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - maxWidth - 8);
    }
    left = Math.max(8, left);

    // Always open below the trigger (never flip upward).
    const top = rect.bottom + gap;
    const maxHeight = Math.max(160, window.innerHeight - top - 8);

    const next: PanelCoords = {
      top,
      left,
      width: maxWidth,
      maxHeight,
    };

    setPlacement("below");
    setCoords((prev) => {
      if (
        prev &&
        prev.top === next.top &&
        prev.left === next.left &&
        prev.width === next.width &&
        prev.maxHeight === next.maxHeight
      ) {
        return prev;
      }
      return next;
    });
  }, [open, anchor, preferredWidth]);

  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition, open]);

  useEffect(() => {
    if (!open) return;
    const onReposition = () => updatePosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updatePosition]);

  // Re-measure after first paint once content height is known
  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, children, updatePosition]);

  if (!open || !coords || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={setRefs}
      id={id}
      role="dialog"
      className="fixed z-[200] rounded-2xl border border-[#eaecf0] bg-white p-4 shadow-xl overflow-y-auto"
      style={{
        top: coords.top,
        left: coords.left,
        width: coords.width,
        maxHeight: Math.min(448, coords.maxHeight),
      }}
      data-placement={placement}
    >
      {children}
    </div>,
    document.body,
  );
}

export function PropertySearchFilters({
  value,
  onChange,
  onSubmit,
  variant = "page",
  compact = false,
  className,
  trailing,
}: PropertySearchFiltersProps) {
  const { t, i18n } = useTranslation("property");
  const { t: tGov } = useTranslation("governorates");
  const locale = i18n.language?.startsWith("ar") ? "ar-EG" : "en-US";
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);
  const rootRef = useRef<HTMLFormElement>(null);
  const panelNodeRef = useRef<HTMLDivElement | null>(null);
  const triggerRefs = useRef<
    Partial<Record<PanelId, HTMLButtonElement | null>>
  >({});
  const uid = useId();

  const patch = (partial: Partial<PropertyFilterState>) => {
    onChange({ ...value, ...partial });
  };

  const setTriggerRef = (id: PanelId) => (node: HTMLButtonElement | null) => {
    triggerRefs.current[id] = node;
  };

  useEffect(() => {
    setOpenPanel(null);
  }, [compact]);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelNodeRef.current?.contains(target)) return;
      setOpenPanel(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenPanel(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const listingTabs: { value: ListingType; label: string }[] = [
    { value: "sale", label: t("filters.buy") },
    { value: "rent", label: t("filters.rent") },
  ];

  const togglePanel = (id: PanelId) => {
    setOpenPanel((prev) => (prev === id ? null : id));
  };

  const listingLabel =
    value.type === "rent"
      ? t("filters.rent")
      : value.type === "sale"
        ? t("filters.buy")
        : t("filters.buy");

  const buildingLabel =
    value.building === "all"
      ? t("filters.propertyType")
      : (translatedBuildingType(t, value.building) ?? value.building);

  const cityLabel = value.city
    ? translatedGovernorate(tGov, value.city) || value.city
    : t("filters.city");

  const bedsBathsLabel = (() => {
    if (!value.beds && !value.baths) return t("filters.bedsBaths");
    const parts: string[] = [];
    if (value.beds !== "") {
      if (value.beds === "0") parts.push(t("filters.studio"));
      else if (value.beds === "7") parts.push(t("filters.bedsSevenPlus"));
      else parts.push(value.beds);
    }
    if (value.baths !== "") {
      parts.push(
        value.baths === "7"
          ? t("filters.bathsSevenPlus")
          : t("filters.bathCount", { count: Number(value.baths) }),
      );
    }
    return parts.join(" · ");
  })();

  const formatNum = (n: string) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return n;
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
      num,
    );
  };

  const priceLabel = (() => {
    if (!value.priceMin && !value.priceMax) return t("filters.price");
    if (value.priceMin && value.priceMax) {
      return `${formatNum(value.priceMin)} – ${formatNum(value.priceMax)}`;
    }
    if (value.priceMin) return `${formatNum(value.priceMin)}+`;
    return `≤ ${formatNum(value.priceMax)}`;
  })();

  const areaLabel = (() => {
    if (!value.areaMin && !value.areaMax) return t("filters.area");
    if (value.areaMin && value.areaMax) {
      return `${value.areaMin} – ${value.areaMax} ${t("listing.areaUnit")}`;
    }
    if (value.areaMin) return `${value.areaMin}+ ${t("listing.areaUnit")}`;
    return `≤ ${value.areaMax} ${t("listing.areaUnit")}`;
  })();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setOpenPanel(null);
    onSubmit?.();
  };

  const panels = (
    <>
      <FilterPanelPortal
        open={openPanel === "listing"}
        anchor={triggerRefs.current.listing ?? null}
        panelRef={(node) => {
          panelNodeRef.current = node;
        }}
        id={`${uid}-listing`}
        preferredWidth={200}
      >
        <div className="flex flex-col gap-1">
          {listingTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                patch({
                  type: tab.value,
                  priceMin: "",
                  priceMax: "",
                });
                setOpenPanel(null);
              }}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-start transition-colors",
                value.type === tab.value
                  ? "bg-primary/15 text-primary"
                  : "text-[#344054] hover:bg-secondary",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </FilterPanelPortal>

      <FilterPanelPortal
        open={openPanel === "city"}
        anchor={triggerRefs.current.city ?? null}
        panelRef={(node) => {
          panelNodeRef.current = node;
        }}
        id={`${uid}-city`}
        preferredWidth={384}
      >
        <p className="text-sm font-semibold text-[#344054] mb-3">
          {t("filters.city")}
        </p>
        <div className="flex flex-wrap gap-2">
          <Chip
            selected={!value.city}
            onClick={() => {
              patch({ city: "" });
              setOpenPanel(null);
            }}
          >
            {t("filters.anyCity")}
          </Chip>
          {EGYPT_GOVERNORATES.map((slug) => (
            <Chip
              key={slug}
              selected={value.city === slug}
              onClick={() => {
                patch({ city: value.city === slug ? "" : slug });
                setOpenPanel(null);
              }}
            >
              {tGov(slug)}
            </Chip>
          ))}
        </div>
      </FilterPanelPortal>

      <FilterPanelPortal
        open={openPanel === "building"}
        anchor={triggerRefs.current.building ?? null}
        panelRef={(node) => {
          panelNodeRef.current = node;
        }}
        id={`${uid}-building`}
        preferredWidth={352}
      >
        <p className="text-sm font-semibold text-[#344054] mb-3">
          {t("filters.propertyType")}
        </p>
        <div className="flex flex-wrap gap-2">
          <Chip
            selected={value.building === "all"}
            onClick={() => patch({ building: "all" })}
          >
            {t("filters.propertyType")}
          </Chip>
          {BUILDING_TYPE_OPTIONS.map((type) => (
            <Chip
              key={type}
              selected={value.building === type}
              onClick={() => patch({ building: type })}
            >
              {t(`listing.buildingTypes.${type}`)}
            </Chip>
          ))}
        </div>
      </FilterPanelPortal>

      <FilterPanelPortal
        open={openPanel === "beds"}
        anchor={triggerRefs.current.beds ?? null}
        panelRef={(node) => {
          panelNodeRef.current = node;
        }}
        id={`${uid}-beds`}
        preferredWidth={384}
      >
        <p className="text-sm font-semibold text-[#344054] mb-3">
          {t("listing.bedrooms")}
        </p>
        <div className="flex flex-wrap gap-2 mb-5">
          {BED_OPTIONS.map((n) => (
            <CircleChoice
              key={n}
              wide={n === "0" || n === "7"}
              selected={value.beds === n}
              onClick={() => patch({ beds: value.beds === n ? "" : n })}
            >
              {n === "0" ? t("filters.studio") : n === "7" ? "7+" : n}
            </CircleChoice>
          ))}
        </div>
        <p className="text-sm font-semibold text-[#344054] mb-3">
          {t("listing.bathrooms")}
        </p>
        <div className="flex flex-wrap gap-2">
          {BATH_OPTIONS.map((n) => (
            <CircleChoice
              key={n}
              wide={n === "7"}
              selected={value.baths === n}
              onClick={() => patch({ baths: value.baths === n ? "" : n })}
            >
              {n === "7" ? "7+" : n}
            </CircleChoice>
          ))}
        </div>
      </FilterPanelPortal>

      <FilterPanelPortal
        open={openPanel === "price"}
        anchor={triggerRefs.current.price ?? null}
        panelRef={(node) => {
          panelNodeRef.current = node;
        }}
        id={`${uid}-price`}
        preferredWidth={352}
      >
        <p className="text-sm font-semibold text-[#344054] mb-3">
          {t("filters.price")}
        </p>
        <RangeInputs
          min={value.priceMin}
          max={value.priceMax}
          minPlaceholder={t("filters.minPrice")}
          maxPlaceholder={t("filters.maxPrice")}
          onMinChange={(priceMin) => patch({ priceMin })}
          onMaxChange={(priceMax) => patch({ priceMax })}
        />
      </FilterPanelPortal>

      <FilterPanelPortal
        open={openPanel === "area"}
        anchor={triggerRefs.current.area ?? null}
        panelRef={(node) => {
          panelNodeRef.current = node;
        }}
        id={`${uid}-area`}
        preferredWidth={352}
      >
        <p className="text-sm font-semibold text-[#344054] mb-3">
          {t("filters.areaTitle")}
        </p>
        <RangeInputs
          min={value.areaMin}
          max={value.areaMax}
          minPlaceholder={t("filters.minArea")}
          maxPlaceholder={t("filters.maxArea")}
          onMinChange={(areaMin) => patch({ areaMin })}
          onMaxChange={(areaMax) => patch({ areaMax })}
        />
      </FilterPanelPortal>
    </>
  );

  if (compact) {
    return (
      <form
        ref={rootRef}
        onSubmit={handleSubmit}
        className={cn("w-full", className)}
      >
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex flex-1 min-w-[12rem] max-w-md items-center rounded-full border border-[#d0d5dd] bg-white overflow-hidden h-10 shrink">
            <Search className="ms-3 w-4 h-4 text-[#98a2b3] shrink-0" />
            <input
              type="text"
              placeholder={t("filters.searchPlaceholder")}
              value={value.q}
              onChange={(e) => patch({ q: e.target.value })}
              className="flex-1 min-w-0 bg-transparent border-0 outline-none px-2 py-2 text-sm text-[#344054] placeholder:text-[#98a2b3]"
            />
          </div>

          <FilterPill
            label={listingLabel}
            active
            open={openPanel === "listing"}
            onClick={() => togglePanel("listing")}
            panelId={`${uid}-listing`}
            buttonRef={setTriggerRef("listing")}
            className={listingPillClass}
          />

          <FilterPill
            label={cityLabel}
            active={Boolean(value.city)}
            open={openPanel === "city"}
            onClick={() => togglePanel("city")}
            panelId={`${uid}-city`}
            buttonRef={setTriggerRef("city")}
          />

          <FilterPill
            label={buildingLabel}
            active={value.building !== "all"}
            open={openPanel === "building"}
            onClick={() => togglePanel("building")}
            panelId={`${uid}-building`}
            buttonRef={setTriggerRef("building")}
          />

          <FilterPill
            label={bedsBathsLabel}
            active={Boolean(value.beds || value.baths)}
            open={openPanel === "beds"}
            onClick={() => togglePanel("beds")}
            panelId={`${uid}-beds`}
            buttonRef={setTriggerRef("beds")}
          />

          <FilterPill
            label={priceLabel}
            active={Boolean(value.priceMin || value.priceMax)}
            open={openPanel === "price"}
            onClick={() => togglePanel("price")}
            panelId={`${uid}-price`}
            buttonRef={setTriggerRef("price")}
          />

          <div className="w-px h-6 bg-[#d0d5dd] shrink-0 mx-1" />

          <button
            ref={setTriggerRef("area")}
            type="button"
            aria-expanded={openPanel === "area"}
            aria-controls={`${uid}-area`}
            onClick={() => togglePanel("area")}
            className={cn(
              pillClass,
              (value.areaMin || value.areaMax || openPanel === "area") &&
                activePillClass,
            )}
          >
            <SlidersHorizontal className="h-4 w-4 shrink-0 opacity-70" />
            <span className="truncate">
              {value.areaMin || value.areaMax
                ? areaLabel
                : t("filters.moreFilters")}
            </span>
            {openPanel === "area" ? (
              <ChevronUp className="h-4 w-4 shrink-0 opacity-70" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
            )}
          </button>

          {trailing}
        </div>
        {panels}
      </form>
    );
  }

  return (
    <form
      ref={rootRef}
      onSubmit={handleSubmit}
      className={cn("w-full", className)}
    >
      {/* Buy / Rent capsule */}
      <div className="flex justify-center mb-3">
        <div
          className={cn(
            "inline-flex rounded-full p-1 shadow-md border",
            variant === "hero"
              ? "bg-white border-white/60"
              : "bg-white border-[#eaecf0]",
          )}
        >
          {listingTabs.map((tab) => {
            const active = value.type === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() =>
                  patch({
                    type: tab.value,
                    priceMin: "",
                    priceMax: "",
                  })
                }
                className={cn(
                  "px-5 py-2 rounded-full text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-[#667085] hover:text-[#344054]",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={cn(
          "rounded-[1.75rem] border p-4 sm:p-5 shadow-xl",
          variant === "hero"
            ? "bg-white/98 backdrop-blur-xl border-white/40"
            : "bg-white border-[#eaecf0]",
        )}
      >
        <div className="flex flex-col gap-4">
          {/* Search row */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch">
            <div className="flex-1 flex items-center rounded-full border border-[#d0d5dd] bg-white overflow-hidden min-h-12">
              <Search className="ms-4 w-5 h-5 text-[#98a2b3] shrink-0" />
              <input
                type="text"
                placeholder={t("filters.searchPlaceholder")}
                value={value.q}
                onChange={(e) => patch({ q: e.target.value })}
                className="flex-1 min-w-0 bg-transparent border-0 outline-none px-3 py-3 text-sm text-[#344054] placeholder:text-[#98a2b3]"
              />
              <Button
                type="submit"
                variant="hero"
                className="me-1.5 h-9 rounded-full px-6 shrink-0"
              >
                {t("filters.search")}
              </Button>
            </div>
            {trailing}
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            <FilterPill
              label={cityLabel}
              active={Boolean(value.city)}
              open={openPanel === "city"}
              onClick={() => togglePanel("city")}
              panelId={`${uid}-city`}
              buttonRef={setTriggerRef("city")}
            />

            <FilterPill
              label={buildingLabel}
              active={value.building !== "all"}
              open={openPanel === "building"}
              onClick={() => togglePanel("building")}
              panelId={`${uid}-building`}
              buttonRef={setTriggerRef("building")}
            />

            <FilterPill
              label={bedsBathsLabel}
              active={Boolean(value.beds || value.baths)}
              open={openPanel === "beds"}
              onClick={() => togglePanel("beds")}
              panelId={`${uid}-beds`}
              buttonRef={setTriggerRef("beds")}
            />

            <FilterPill
              label={priceLabel}
              active={Boolean(value.priceMin || value.priceMax)}
              open={openPanel === "price"}
              onClick={() => togglePanel("price")}
              panelId={`${uid}-price`}
              buttonRef={setTriggerRef("price")}
            />

            <FilterPill
              label={areaLabel}
              active={Boolean(value.areaMin || value.areaMax)}
              open={openPanel === "area"}
              onClick={() => togglePanel("area")}
              panelId={`${uid}-area`}
              buttonRef={setTriggerRef("area")}
            />
          </div>
        </div>
      </div>

      {panels}
    </form>
  );
}
