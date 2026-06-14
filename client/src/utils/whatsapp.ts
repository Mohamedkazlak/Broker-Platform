/** Strip a phone number down to digits for wa.me links. */
export function normalizeWhatsAppNumber(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Full shareable URL for a property listing on the current tenant. */
export function getPropertyUrl(propertyId: string): string {
  if (typeof window === "undefined") {
    return `/properties/${propertyId}`;
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
