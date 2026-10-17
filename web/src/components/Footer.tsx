import Link from "next/link";
import { LogoMark } from "./Logo";
import { addrLink, contractAddress, githubUrl } from "@/lib/config";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-paper-300">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <LogoMark size={24} />
          <span><span className="font-medium text-forest">TraceRoot</span> — Every Product Has a Story.</span>
        </div>
        <div className="flex flex-wrap gap-5">
          <Link href="/about">About</Link>
          <Link href="/docs">Docs</Link>
          <a href={githubUrl} target="_blank" rel="noreferrer">GitHub</a>
          {contractAddress && <a href={addrLink(contractAddress)} target="_blank" rel="noreferrer">Contract</a>}
        </div>
      </div>
    </footer>
  );
}
