import { getAddress } from "viem";

/** Form input parsers. Each throws a plain-language error the form shows as-is. */
export const parseId = (v: string, label = "Batch number") => {
  const s = v.trim().replace(/^#/, "");
  if (!/^\d+$/.test(s) || s === "0") throw new Error(`${label} must be a positive whole number`);
  return BigInt(s);
};
export const parseAddr = (v: string) => {
  const s = v.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(s)) throw new Error("Enter a valid 0x… wallet address");
  // Normalise casing so a mistyped checksum never blocks a valid address.
  return getAddress(s.toLowerCase());
};
export const parseQty = (v: string) => {
  const s = v.trim();
  if (!/^\d+$/.test(s) || s === "0") throw new Error("Quantity must be a positive whole number");
  return BigInt(s);
};
