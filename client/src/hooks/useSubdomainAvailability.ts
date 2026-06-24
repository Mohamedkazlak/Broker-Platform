import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";

export type SubdomainStatus =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "reserved"
  | "invalid";

/**
 * Client-side mirror of the server's DNS-label rule. Kept in sync with
 * `server/utils/subdomainValidator.js` so obviously-invalid input never fires a
 * network request. The server remains the authoritative check.
 */
const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;

const DEBOUNCE_MS = 450;

/**
 * Live "is this subdomain available?" check for the signup form.
 *
 * - Validates format locally first (no request for invalid input).
 * - Debounces ~450ms after the user stops typing.
 * - Cancels the previous in-flight request via AbortController so a slow earlier
 *   response can never overwrite a faster later one.
 */
export function useSubdomainAvailability(rawValue: string): {
  status: SubdomainStatus;
} {
  const [status, setStatus] = useState<SubdomainStatus>("idle");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const normalized = (rawValue ?? "").trim().toLowerCase();

    // Any new input invalidates a previous in-flight check.
    abortRef.current?.abort();

    if (!normalized) {
      setStatus("idle");
      return;
    }

    if (!SUBDOMAIN_PATTERN.test(normalized)) {
      setStatus("invalid");
      return;
    }

    setStatus("checking");

    const controller = new AbortController();
    abortRef.current = controller;

    const timer = window.setTimeout(async () => {
      try {
        const { data } = await api.get("/brokers/check-subdomain", {
          params: { subdomain: normalized },
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (data?.available) {
          setStatus("available");
        } else {
          const reason = data?.reason;
          setStatus(
            reason === "taken" || reason === "reserved" || reason === "invalid"
              ? reason
              : "invalid",
          );
        }
      } catch {
        // Aborted requests and transient network errors fall through here.
        // We don't flip to "available" on error — the DB unique index is the
        // real source of truth, so a failed advisory check just keeps submit
        // gated rather than silently allowing a potential collision.
        if (controller.signal.aborted) return;
        setStatus("idle");
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [rawValue]);

  return { status };
}
