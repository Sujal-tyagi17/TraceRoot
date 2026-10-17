/**
 * Decides what a scanned QR code means. TraceRoot QR codes encode `<site>/batch/<id>`.
 * Accepts: a batch URL on this site, a batch URL from another TraceRoot host (asks first),
 * or a bare batch number. Anything else is rejected without navigating.
 */
export type ScanResult =
  | { kind: "batch"; id: string }
  | { kind: "foreign"; id: string; host: string }
  | { kind: "invalid"; reason: string };

const MAX_LEN = 300;

export function parseScan(raw: string, currentOrigin: string): ScanResult {
  const text = raw.trim();
  if (!text) return { kind: "invalid", reason: "The QR code was empty." };
  if (text.length > MAX_LEN) return { kind: "invalid", reason: "This QR code holds too much text to be a TraceRoot label." };

  const bare = text.replace(/^#/, "");
  if (/^\d{1,12}$/.test(bare)) return bare === "0" || /^0+$/.test(bare) ? { kind: "invalid", reason: "Batch numbers start at 1." } : { kind: "batch", id: String(Number(bare)) };

  let url: URL;
  try { url = new URL(text); } catch { return { kind: "invalid", reason: "This QR code isn't a TraceRoot batch link." }; }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { kind: "invalid", reason: "This QR code isn't a web link." };
  const m = url.pathname.match(/^\/batch\/(\d{1,12})\/?$/);
  if (!m || /^0+$/.test(m[1])) return { kind: "invalid", reason: "This link doesn't point to a TraceRoot batch." };
  const id = String(Number(m[1]));
  return url.origin === currentOrigin ? { kind: "batch", id } : { kind: "foreign", id, host: url.host };
}
