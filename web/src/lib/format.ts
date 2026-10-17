export const short = (a?: string, n = 4) => (a ? `${a.slice(0, 2 + n)}…${a.slice(-n)}` : "—");

/** Prices on-chain are INR paise (2 decimals). */
export const inr = (paise?: bigint | number) => {
  if (paise === undefined) return "—";
  const v = Number(paise) / 100;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(v);
};
export const toPaise = (rupees: string) => {
  const n = Number(rupees);
  if (!Number.isFinite(n) || n < 0) throw new Error("Enter a valid non-negative price");
  return BigInt(Math.round(n * 100));
};

export const date = (secs?: number | bigint) =>
  secs ? new Date(Number(secs) * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
export const dateTime = (secs?: number | bigint) =>
  secs
    ? new Date(Number(secs) * 1000).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "—";

export const GRADE_LABEL: Record<number, string> = { 1: "Rejected", 2: "Poor", 3: "Fair", 4: "Good", 5: "Excellent" };
