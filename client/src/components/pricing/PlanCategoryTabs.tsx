import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { PACKAGE_CATEGORIES, type PackageCategory } from "@/lib/plans";

interface PlanCategoryTabsProps {
  value: PackageCategory;
  onChange: (category: PackageCategory) => void;
  /** Ties the tabs to the panel they control for screen readers. */
  panelId: string;
  className?: string;
}

/**
 * Personal / Enterprise switcher shown above the plan cards.
 *
 * Built from plain buttons rather than a Radix primitive so the pricing page
 * doesn't pull in a new dependency for a two-option control. It follows the
 * tabs ARIA pattern: roving tabindex, arrow-key navigation (mirrored in RTL),
 * and Home/End.
 */
export function PlanCategoryTabs({
  value,
  onChange,
  panelId,
  className,
}: PlanCategoryTabsProps) {
  const { t, i18n } = useTranslation("pricing");
  const isRtl = i18n.dir() === "rtl";
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusTab = (index: number) => {
    const bounded =
      (index + PACKAGE_CATEGORIES.length) % PACKAGE_CATEGORIES.length;
    onChange(PACKAGE_CATEGORIES[bounded]);
    tabRefs.current[bounded]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    // In RTL the visual order is mirrored, so the arrow keys must be too.
    const forward = isRtl ? "ArrowLeft" : "ArrowRight";
    const backward = isRtl ? "ArrowRight" : "ArrowLeft";

    if (event.key === forward) {
      event.preventDefault();
      focusTab(index + 1);
    } else if (event.key === backward) {
      event.preventDefault();
      focusTab(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusTab(PACKAGE_CATEGORIES.length - 1);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={t("categories.ariaLabel")}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 p-1",
        className,
      )}
    >
      {PACKAGE_CATEGORIES.map((category, index) => {
        const isSelected = category === value;
        return (
          <button
            key={category}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`plan-category-tab-${category}`}
            aria-selected={isSelected}
            aria-controls={panelId}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(category)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-300",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isSelected
                ? "bg-background text-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`categories.${category}.label`)}
          </button>
        );
      })}
    </div>
  );
}
