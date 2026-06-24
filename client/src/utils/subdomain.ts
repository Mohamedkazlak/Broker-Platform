/** Matches server-side pending placeholder prefix (pre-plan-selection). */
export const PENDING_SUBDOMAIN_PREFIX = "p-";

/** Default Vite dev-server port when `window.location.port` is empty. */
export const LOCAL_DEV_PORT = "8080";

export function isPendingSubdomain(
  subdomain: string | null | undefined,
): boolean {
  return (
    typeof subdomain === "string" &&
    subdomain.startsWith(PENDING_SUBDOMAIN_PREFIX)
  );
}

/** Dev-server port for simulated tenant URLs (e.g. custom-domain previews). */
export function getLocalDevPort(): string {
  if (typeof window === "undefined") return LOCAL_DEV_PORT;
  return window.location.port || LOCAL_DEV_PORT;
}
