import type { ReactNode } from "react";
import { addrLink, explorerUrl, txLink } from "@/lib/config";

/** Links to the block explorer when the network has one; plain text on a local chain (no dead links). */
export function ExplorerLink({ kind, value, className = "", children }: { kind: "tx" | "address"; value: string; className?: string; children: ReactNode }) {
  if (!explorerUrl) return <span className={className.replace(/\bunderline\b/g, "")} title="This local test chain has no block explorer">{children}</span>;
  return <a href={kind === "tx" ? txLink(value) : addrLink(value)} target="_blank" rel="noreferrer" className={className}>{children}</a>;
}
