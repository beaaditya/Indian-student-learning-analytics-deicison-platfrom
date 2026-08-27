/**
 * LearnIQ — Number & Metric Formatters
 */

export function formatNumber(val) {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return new Intl.NumberFormat("en-US").format(Number(val));
}

export function formatScore(val, decimals = 1) {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return Number(val).toFixed(decimals);
}

export function formatPercent(val, decimals = 1) {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return `${Number(val).toFixed(decimals)}%`;
}

export function formatMonthLabel(monthStr) {
  if (!monthStr) return "";
  try {
    const [year, month] = monthStr.split("-");
    const date = new Date(year, parseInt(month, 10) - 1, 1);
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  } catch {
    return monthStr;
  }
}
