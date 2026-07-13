/** Platform Instapay account shown on the manual payment QR step. */
export const INSTAPAY_ACCOUNT = {
  handle: "mohamadkazlak@instapay",
  link: "https://ipn.eg/S/mohamadkazlak/instapay/71Msdb",
  qrImagePath: "/instapay-qr.png",
} as const;

export const INSTAPAY_RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const INSTAPAY_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const CLAIM_TOKEN_KEY = "instapay_claim_token";

export type InstapaySubmissionStatus =
  | "pending_review"
  | "approved"
  | "rejected";

export interface InstapayReceiptPayload {
  data: string;
  mimeType: string;
  fileName: string;
}

export function validateInstapayReceiptFile(file: File): string | null {
  if (
    !INSTAPAY_ALLOWED_MIME.includes(
      file.type as (typeof INSTAPAY_ALLOWED_MIME)[number],
    )
  ) {
    return "invalidType";
  }
  if (file.size > INSTAPAY_RECEIPT_MAX_BYTES) {
    return "tooLarge";
  }
  return null;
}

/** Read a File as a base64 data-URL payload for POST /instapay/submit-receipt. */
export function fileToReceiptPayload(
  file: File,
): Promise<InstapayReceiptPayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve({
        data: result,
        mimeType: file.type,
        fileName: file.name,
      });
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/** Claim token lets the pending page poll without a logged-in session. */
export function saveInstapayClaimToken(token: string) {
  sessionStorage.setItem(CLAIM_TOKEN_KEY, token);
}

export function getInstapayClaimToken(): string | null {
  return sessionStorage.getItem(CLAIM_TOKEN_KEY);
}

export function clearInstapayClaimToken() {
  sessionStorage.removeItem(CLAIM_TOKEN_KEY);
}

export function hasInstapayClaimToken(): boolean {
  return Boolean(sessionStorage.getItem(CLAIM_TOKEN_KEY));
}
