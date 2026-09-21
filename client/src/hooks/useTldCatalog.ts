import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { DomainPriceQuote } from "./useCustomDomainAvailability";

export type TldListQuote = DomainPriceQuote & {
  tld: string;
};

const SEARCH_DEBOUNCE_MS = 300;

function parseTldRows(rows: unknown): TldListQuote[] {
  if (!Array.isArray(rows)) return [];
  return rows.filter(
    (row: TldListQuote) =>
      typeof row?.tld === "string" &&
      row.tld.length > 0 &&
      typeof row.priceUSD === "number" &&
      typeof row.priceEGP === "number",
  );
}

/**
 * Featured name.com TLD catalog (the common 50) used by the default picker.
 */
export function useTldCatalog(enabled = true): {
  tlds: TldListQuote[];
  isLoading: boolean;
} {
  const [tlds, setTlds] = useState<TldListQuote[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);

    (async () => {
      try {
        const { data } = await api.get("/domains/tlds");
        if (!active) return;
        setTlds(parseTldRows(data?.tlds));
      } catch (err) {
        console.error("Error loading TLD catalog:", err);
        if (active) setTlds([]);
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [enabled]);

  return { tlds, isLoading };
}

/**
 * Search the full name.com catalog so an off-list TLD still returns a price.
 */
export function useTldSearch(
  query: string,
  enabled = true,
): {
  tlds: TldListQuote[];
  isSearching: boolean;
} {
  const [tlds, setTlds] = useState<TldListQuote[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const needle = query.trim().toLowerCase().replace(/^\.+/, "");

    if (!enabled || !needle) {
      setTlds([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);

    const timer = window.setTimeout(async () => {
      try {
        const { data } = await api.get("/domains/tlds", {
          params: { q: needle },
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setTlds(parseTldRows(data?.tlds));
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Error searching TLD catalog:", err);
        setTlds([]);
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, enabled]);

  return { tlds, isSearching };
}
