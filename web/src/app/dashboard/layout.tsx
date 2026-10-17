"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAccount } from "wagmi";
import { useRoles } from "@/lib/hooks";
import { isConfigured } from "@/lib/config";
import { ROLE_LABEL, type RoleName } from "@/lib/traceroot";
import { DashContext } from "@/components/DashCtx";
import { Connect } from "@/components/Connect";
import { Card, NotConfigured, PageHeader, Pill, Spinner } from "@/components/ui";

const TABS = [
  ["/dashboard", "Overview"], ["/dashboard/batches", "Batches"], ["/dashboard/transfers", "Transfers"],
  ["/dashboard/inspections", "Inspections"], ["/dashboard/recalls", "Recalls"], ["/dashboard/admin", "Admin"],
] as const;

export default function DashLayout({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const roles = useRoles(address);
  useEffect(() => setMounted(true), []);

  if (!isConfigured) return <><PageHeader eyebrow="Participant dashboard" title="Dashboard" /><NotConfigured /></>;
  const list = roles.data ?? [];
  return (
    <div>
      <PageHeader eyebrow="Participant dashboard" title="Your supply chain desk">
        Every action here is a real transaction on the testnet, checked by the contract.
      </PageHeader>
      {!mounted ? <Spinner label="" /> : !isConnected ? (
        <Card className="flex flex-col items-start gap-3">
          <p className="text-sm text-slate-600">Connect a wallet to act as a participant. Browsing batches never needs a wallet.</p>
          <Connect />
        </Card>
      ) : (
        <DashContext.Provider value={{ address, roles: list, has: (r: RoleName) => list.includes(r) }}>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600">Your roles:</span>
            {roles.isLoading ? <span className="text-sm">…</span> : list.length ? list.map((r) => <Pill key={r} tone="good">{ROLE_LABEL[r]}</Pill>) : <Pill tone="warn">None — ask the administrator to grant a role</Pill>}
          </div>
          <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-paper-300">
            {TABS.map(([href, label]) => (
              <Link key={href} href={href} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${path === href ? "border-forest font-medium text-forest" : "border-transparent text-slate-600 hover:text-forest"}`}>{label}</Link>
            ))}
          </nav>
          {children}
        </DashContext.Provider>
      )}
    </div>
  );
}
