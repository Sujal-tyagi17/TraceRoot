"use client";
import { useQuery } from "@tanstack/react-query";
import { useBatches } from "@/lib/hooks";
import { rolesOf, ROLE_LABEL } from "@/lib/traceroot";
import { isConfigured } from "@/lib/config";
import { ExplorerLink } from "@/components/ExplorerLink";
import { short } from "@/lib/format";
import { Card, Empty, NotConfigured, PageHeader, Pill, Spinner } from "@/components/ui";

export default function Participants() {
  const { data, isLoading } = useBatches(200);
  const addrs = [...new Set((data ?? []).flatMap((b) => [b.producer, b.custodian]))];
  const roles = useQuery({ queryKey: ["dir", addrs.join()], queryFn: async () => Promise.all(addrs.map(async (a) => ({ a, r: await rolesOf(a) }))), enabled: addrs.length > 0 });

  return (
    <div>
      <PageHeader eyebrow="Directory" title="Participants">
        Wallets that have produced or held a batch. Only public wallet addresses and on-chain roles are shown — no personal data.
      </PageHeader>
      {!isConfigured ? <NotConfigured /> : isLoading || roles.isLoading ? <Spinner label="Looking up participants…" /> : !addrs.length ? <Empty title="No participants have handled batches yet" /> : (
        <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(roles.data ?? []).map(({ a, r }) => {
            const held = (data ?? []).filter((b) => b.custodian === a && b.status === "Active").length;
            return (
              <Card key={a} className="p-4">
                <ExplorerLink kind="address" value={a} className="font-mono text-sm text-ink underline">{short(a, 6)}</ExplorerLink>
                <div className="mt-2 flex flex-wrap gap-1">{r.length ? r.map((x) => <Pill key={x} tone="good">{ROLE_LABEL[x]}</Pill>) : <Pill>Role revoked</Pill>}</div>
                <p className="mt-2 text-xs text-slate-600">{held} active batch{held === 1 ? "" : "es"} in custody</p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
