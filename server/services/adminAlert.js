/**
 * Platform admin alerts. Same mechanism billingMonitor / domainMonitor use:
 * a loud, searchable console line. Render log drains / ops paging can match
 * on the `[ADMIN ALERT]` prefix.
 *
 * @param {string} message
 * @param {{ urgent?: boolean }} [options]
 */
export function alertAdmins(message, { urgent = false } = {}) {
  const prefix = urgent ? "❌ [ADMIN ALERT][URGENT]" : "❌ [ADMIN ALERT]";
  console.error(`${prefix} ${message}`);
}
