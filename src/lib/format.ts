// Display formatting. Money is integer cents everywhere; it only becomes dollars here.

export function money(cents: number | null | undefined, opts: { compact?: boolean } = {}) {
  if (cents === null || cents === undefined) return "—";
  const dollars = cents / 100;
  if (opts.compact && dollars >= 1000) {
    return `$${trimZero((dollars / 1000).toFixed(dollars >= 10_000 ? 0 : 1))}k`;
  }
  return `$${dollars.toLocaleString("en-US", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function trimZero(s: string) {
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

export function compactNumber(n: number) {
  if (n >= 1_000_000) return `${trimZero((n / 1_000_000).toFixed(1))}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${trimZero((n / 1000).toFixed(1))}k`;
  return String(n);
}

export function fullNumber(n: number) {
  return n.toLocaleString("en-US");
}

export type ReachRange = { low: number; mid: number; high: number };

/** Reach is always shown as a range, never one promised number. */
export function reachRange(r: ReachRange | null | undefined) {
  if (!r) return "—";
  return `${compactNumber(r.low)}–${compactNumber(r.high)}`;
}

/** Client-side copy of the server's model, for live previews while typing. */
export function estimateReach(amountCents: number, perDollar: number, rangePct = 15): ReachRange {
  const mid = Math.round((amountCents / 100) * perDollar);
  const spread = rangePct / 100;
  return { low: roundNice(mid * (1 - spread)), mid: roundNice(mid), high: roundNice(mid * (1 + spread)) };
}

function roundNice(n: number) {
  if (n < 100) return Math.round(n);
  if (n < 10_000) return Math.round(n / 10) * 10;
  return Math.round(n / 100) * 100;
}

export function date(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function dateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function timeAgo(iso: string) {
  const sec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = sec / 60;
  if (min < 60) return `${Math.floor(min)}m ago`;
  const h = min / 60;
  if (h < 24) return `${Math.floor(h)}h ago`;
  const d = h / 24;
  if (d < 7) return `${Math.floor(d)}d ago`;
  return date(iso);
}

/** "18 days left", "5 hours left", "Ended". */
export function timeLeft(deadline: string | null | undefined) {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const hours = ms / 3_600_000;
  if (hours < 1) return "Less than an hour left";
  if (hours < 48) return `${Math.floor(hours)} hours left`;
  return `${Math.floor(hours / 24)} days left`;
}

/** Compact form for tight spaces: "44h", "17d". */
export function timeLeftShort(deadline: string | null | undefined) {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const hours = ms / 3_600_000;
  return hours < 48 ? `${Math.max(1, Math.floor(hours))}h` : `${Math.floor(hours / 24)}d`;
}

export function percent(n: number) {
  return `${Math.max(0, Math.round(n))}%`;
}

/** Parses "$1,250.50" or "1250.5" into cents; null when not a number. */
export function parseDollars(input: string): number | null {
  const clean = input.replace(/[^0-9.]/g, "");
  if (!clean || clean === ".") return null;
  const value = Number(clean);
  return Number.isFinite(value) ? Math.round(value * 100) : null;
}
