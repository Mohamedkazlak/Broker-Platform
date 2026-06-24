import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";

export type CustomDomainStatus =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "invalid";

/**
 * Client-side mirror of the server's domain shape gate so obviously-invalid
 * input never fires a request. The server remains authoritative.
 */
const DOMAIN_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/;

const DEBOUNCE_MS = 450;

/**
 * Live "is this custom domain available (and how much)?" check.
 *
 * Mirrors useSubdomainAvailability: local format gate, ~450ms debounce, and
 * AbortController cancellation so a slow earlier response can't overwrite a
 * faster later one. Backed by the mocked GET /api/domains/check-custom.
 */
export function useCustomDomainAvailability(rawDomain: string): {
  status: CustomDomainStatus;
  price: number | null;
} {
  const [status, setStatus] = useState<CustomDomainStatus>("idle");
  const [price, setPrice] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const normalized = (rawDomain ?? "").trim().toLowerCase();

    abortRef.current?.abort();
    setPrice(null);

    if (!normalized) {
      setStatus("idle");
      return;
    }

    if (!DOMAIN_PATTERN.test(normalized)) {
      setStatus("invalid");
      return;
    }

    setStatus("checking");

    const controller = new AbortController();
    abortRef.current = controller;

    const timer = window.setTimeout(async () => {
      try {
        const { data } = await api.get("/domains/check-custom", {
          params: { domain: normalized },
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (typeof data?.price === "number") setPrice(data.price);

        if (data?.available) {
          setStatus("available");
        } else {
          setStatus(data?.reason === "invalid" ? "invalid" : "taken");
        }
      } catch {
        if (controller.signal.aborted) return;
        setStatus("idle");
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [rawDomain]);

  return { status, price };
}
