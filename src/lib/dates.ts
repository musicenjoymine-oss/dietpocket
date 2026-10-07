/** Local-date helpers. Dates are plain YYYY-MM-DD strings in the user's timezone. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(s: string, n: number): string {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Whole days from a to b (b - a). DST-safe. */
export function daysBetween(a: string, b: string): number {
  const da = parseISODate(a);
  const db = parseISODate(b);
  return Math.round((Date.UTC(db.getFullYear(), db.getMonth(), db.getDate()) -
    Date.UTC(da.getFullYear(), da.getMonth(), da.getDate())) / 86400000);
}
