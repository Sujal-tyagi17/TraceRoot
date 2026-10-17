import type { RoleName } from "./traceroot";

/**
 * What each role may do. Mirrors the contract's checks so the dashboard only shows usable actions.
 * This is UX only — the contract still enforces every rule.
 */
export function can(roles: RoleName[]) {
  const has = (...r: RoleName[]) => r.some((x) => roles.includes(x));
  const participant = has("PRODUCER", "TRADER", "TRANSPORTER", "INSPECTOR", "RETAILER");
  return {
    participant,
    createBatch: has("PRODUCER"),
    splitMerge: has("PRODUCER", "TRADER", "RETAILER"),
    addEvidence: participant,
    markSold: has("RETAILER"),
    transfer: participant,
    logCondition: has("TRANSPORTER"),
    inspect: has("INSPECTOR"),
    recall: has("ADMIN", "INSPECTOR"),
    clearRecall: has("ADMIN"),
    manageRoles: has("ADMIN"),
  };
}
export type Can = ReturnType<typeof can>;

export const TABS: { href: string; label: string; visible: (c: Can) => boolean }[] = [
  { href: "/dashboard", label: "Overview", visible: () => true },
  { href: "/dashboard/batches", label: "Batches", visible: (c) => c.createBatch || c.splitMerge || c.addEvidence || c.markSold },
  { href: "/dashboard/transfers", label: "Transfers", visible: (c) => c.transfer },
  { href: "/dashboard/inspections", label: "Inspections", visible: (c) => c.inspect },
  { href: "/dashboard/recalls", label: "Recalls", visible: (c) => c.recall },
  { href: "/dashboard/admin", label: "Admin", visible: (c) => c.manageRoles },
];
