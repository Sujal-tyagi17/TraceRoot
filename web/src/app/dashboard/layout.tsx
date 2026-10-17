"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAccount } from "wagmi";
import { useRoles } from "@/lib/hooks";
import { isConfigured } from "@/lib/config";
import { ROLE_LABEL, type RoleName } from "@/lib/traceroot";
import { DashContext } from "@/components/DashCtx";
import { TABS, can } from "@/lib/permissions";
import { Connect } from "@/components/Connect";
import { Card, NotConfigured, PageHeader, Pill, Spinner } from "@/components/ui";


export default function DashLayout({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const roles = useRoles(address);
  useEffect(() => setMounted(true), []);

  if (!isConfigured) return <><PageHeader eyebrow="Participant dashboard" title="Dashboard" /><NotConfigured /></>;
  const list = roles.data ?? [];
  const c = can(list);
  const tabs = TABS.filter((t) => t.visible(c));
  const current = TABS.find((t) => t.href === path);
  const blocked = !roles.isLoading && current && !current.visible(c);
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
        <DashContext.Provider value={{ address, roles: list, has: (r: RoleName) => list.includes(r), can: c }}>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600">Signed in as</span>
            {roles.isLoading ? <span className="text-sm">…</span> : list.length ? list.map((r) => <Pill key={r} tone="good">{ROLE_LABEL[r]}</Pill>) : <Pill tone="warn">a wallet with no role yet. Ask the administrator to grant one.</Pill>}
          </div>
          <nav className="mb-8 inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-paper-300 bg-white p-1">
            {tabs.map(({ href, label }) => (
              <Link key={href} href={href} aria-current={path === href ? "page" : undefined} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-colors ${path === href ? "bg-forest font-medium text-paper" : "text-slate-600 hover:text-forest"}`}>{label}</Link>
            ))}
          </nav>
          {roles.isLoading ? <Spinner label="Checking your roles…" /> : blocked ? (
            <Card className="text-sm text-slate-600">
              <p className="font-medium text-slate">{current!.label} isn&apos;t available for your role</p>
              <p className="mt-1">Switch to a wallet with the right role, or ask the administrator. <Link href="/dashboard" className="underline">Back to overview</Link></p>
            </Card>
          ) : children}
        </DashContext.Provider>
      )}
    </div>
  );
}
