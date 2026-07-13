/**
 * Platform Instapay account details shown during manual onboarding payment.
 * Paymob does not auto-confirm Instapay yet — clients transfer here, upload a
 * receipt, and an admin approves before the subscription activates.
 */
export const INSTAPAY = {
  handle: "mohamadkazlak@instapay",
  link: "https://ipn.eg/S/mohamadkazlak/instapay/71Msdb",
  /** Served from client/public — shown on the QR step. */
  qrImagePath: "/instapay-qr.png",
};

export const INSTAPAY_RECEIPT_BUCKET = "instapay-receipts";
export const INSTAPAY_RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const INSTAPAY_ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
