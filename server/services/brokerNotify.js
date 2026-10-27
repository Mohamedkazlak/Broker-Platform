/**
 * Broker-facing notifications for domain purchase failures / refunds.
 *
 * The platform has no SMTP/provider wire yet — we use the same durable log
 * channel as admin alerts, with both Arabic and English bodies so ops (and a
 * future mailer) can forward them. Callers persist `broker_notified_at` on the
 * payment session after this returns so notify stays idempotent.
 */

/**
 * @param {object} params
 * @param {string|null|undefined} params.email
 * @param {string} params.domain
 * @param {string} params.reasonPlain  short English cause (e.g. "domain taken")
 * @param {string|number} params.amount
 * @param {string} [params.currency]
 * @param {'registration_failed'|'refund_and_revert'} [params.kind]
 */
export function notifyBrokerDomainFailure({
  email,
  domain,
  reasonPlain,
  amount,
  currency = "EGP",
  kind = "registration_failed",
}) {
  const to = String(email ?? "").trim() || "(unknown)";
  const amountLabel = `${amount} ${currency}`;

  let en;
  let ar;

  if (kind === "refund_and_revert") {
    en =
      `We could not finish setting up your custom domain (${domain}). ` +
      `Your payment of ${amountLabel} is being refunded in full. ` +
      `Your platform is back on its subdomain (no custom-domain plan). ` +
      `You can choose another plan or Max with a subdomain anytime.`;
    ar =
      `تعذر إكمال إعداد النطاق الخاص (${domain}). ` +
      `يتم استرداد مبلغ ${amountLabel} بالكامل. ` +
      `عادت منصتك إلى النطاق الفرعي (بدون خطة نطاق مخصص). ` +
      `يمكنك اختيار خطة أخرى أو Max مع نطاق فرعي في أي وقت.`;
  } else {
    en =
      `We could not register your custom domain (${domain}): ${reasonPlain}. ` +
      `Your full payment of ${amountLabel} is being refunded. ` +
      `Your account was not changed. You can choose another plan or Max with a subdomain.`;
    ar =
      `تعذر تسجيل النطاق الخاص (${domain}): ${reasonPlain}. ` +
      `يتم استرداد كامل مبلغ الدفع ${amountLabel}. ` +
      `لم يتم تغيير حسابك. يمكنك اختيار خطة أخرى أو Max مع نطاق فرعي.`;
  }

  console.log(
    `[broker-notify] to=${to} domain=${domain} kind=${kind}\n` +
      `  EN: ${en}\n` +
      `  AR: ${ar}`,
  );

  return { email: to, en, ar };
}
