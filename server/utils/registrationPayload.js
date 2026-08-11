import { encryptString, decryptString } from "./secretBox.js";

/**
 * A deferred signup (draft, no `brokers` row yet) has to carry its form data
 * — including the plaintext password — from submission through to whatever
 * event finally provisions the account (Instapay admin approval, or a Reachi
 * `payment.completed` webhook). Encrypt it at rest rather than storing the
 * password in the clear in `registration_payload`.
 */

export function encryptRegistrationPayload({
  formData,
  package: pkg,
  packageCategory,
  domain,
  domainFields,
}) {
  const passwordEnc = encryptString(formData.password);
  const { password: _omit, ...safeForm } = formData;
  return {
    formData: { ...safeForm, passwordEnc },
    package: pkg,
    packageCategory,
    domain,
    domainFields,
  };
}

export function decryptRegistrationPayload(payload) {
  if (!payload?.formData?.passwordEnc) {
    throw Object.assign(new Error("Registration payload is missing"), {
      status: 500,
    });
  }
  const password = decryptString(payload.formData.passwordEnc);
  const { passwordEnc: _omit, ...rest } = payload.formData;
  return {
    formData: { ...rest, password },
    package: payload.package,
    packageCategory: payload.packageCategory,
    domain: payload.domain,
    domainFields: payload.domainFields,
  };
}
