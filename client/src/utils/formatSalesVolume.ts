/** Format a sales-volume estimate for hero stats (EGP). */
export function formatSalesVolume(amount: number): string {
  if (amount >= 1_000_000_000) {
    const billions = amount / 1_000_000_000;
    return `${billions >= 10 ? Math.floor(billions) : billions.toFixed(1).replace(/\.0$/, "")}B+ EGP`;
  }
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `${millions >= 10 ? Math.floor(millions) : millions.toFixed(1).replace(/\.0$/, "")}M+ EGP`;
  }
  if (amount >= 1_000) {
    return `${Math.round(amount / 1_000)}K+ EGP`;
  }
  return `${amount.toLocaleString()} EGP`;
}

/** Display property count with a "+" suffix when at or above the threshold. */
export function formatPropertyCount(count: number): string {
  if (count >= 100) return `${Math.floor(count / 10) * 10}+`;
  if (count >= 20) return `${count}+`;
  return String(count);
}

/** Display city count for hero stats. */
export function formatCityCount(count: number): string {
  return count >= 10 ? `${count}+` : String(count);
}
