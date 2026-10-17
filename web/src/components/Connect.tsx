"use client";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { chain } from "@/lib/config";
import { short } from "@/lib/format";

export function Connect() {
  const [mounted, setMounted] = useState(false);
  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-32" />;

  if (!isConnected) {
    const c = connectors[0];
    return (
      <div className="flex flex-col items-end">
        <button
          onClick={() => c && connect({ connector: c })}
          disabled={!c || isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-forest px-3.5 py-2 text-sm font-medium text-paper hover:bg-forest-700 disabled:opacity-50"
        >
          <Wallet size={15} /> {isPending ? "Connecting…" : "Connect wallet"}
        </button>
        {error && <span className="mt-1 text-xs text-alert">{/not found|provider/i.test(error.message) ? "No browser wallet found — install MetaMask" : error.message.slice(0, 60)}</span>}
      </div>
    );
  }
  if (chainId !== chain.id) {
    return (
      <button onClick={() => switchChain({ chainId: chain.id })} className="rounded-lg bg-amber-soft px-3.5 py-2 text-sm font-medium text-amber">
        Switch to {chain.name}
      </button>
    );
  }
  return (
    <button onClick={() => disconnect()} title="Disconnect" className="inline-flex items-center gap-2 rounded-lg border border-paper-300 bg-white px-3.5 py-2 font-mono text-xs text-forest hover:bg-paper-200">
      <span className="h-2 w-2 rounded-full bg-lime-600" /> {short(address)}
    </button>
  );
}
