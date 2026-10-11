import {
  buildBrokerWebsiteUrl,
  hasActiveCustomDomain,
  type BrokerHostFields,
} from "@/utils/tenant";

/** Strip a phone number down to digits for wa.me links. */
export function normalizeWhatsAppNumber(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Full shareable URL for a property listing. Uses the broker's custom domain
 * when it is active, otherwise the host currently open.
 */
export function getPropertyUrl(
  propertyId: string,
  broker?: BrokerHostFields | null,
): string {
  if (typeof window === "undefined") {
    return `/properties/${propertyId}`;
  }
  if (broker && hasActiveCustomDomain(broker)) {
    return buildBrokerWebsiteUrl(broker, `/properties/${propertyId}`);
  }
  return `${window.location.origin}/properties/${propertyId}`;
}

/** Build a WhatsApp chat URL with a pre-filled message. */
export function buildWhatsAppUrl(phone: string, text: string): string | null {
  const normalized = normalizeWhatsAppNumber(phone);
  if (!normalized) return null;

  const params = new URLSearchParams({ text });
  return `https://wa.me/${normalized}?${params.toString()}`;
}
