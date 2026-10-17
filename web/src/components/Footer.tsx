import Link from "next/link";
import { LogoMark } from "./Logo";
import { addrLink, contractAddress, explorerUrl, githubUrl } from "@/lib/config";

export function Footer() {
  return (
    <footer className="mt-28 bg-forest text-paper/80">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="flex items-center gap-3"><LogoMark size={30} /><span className="font-display text-xl font-[750] tracking-tight text-paper">TraceRoot</span></div>
          <p className="mt-3 max-w-sm text-sm">A blockchain provenance platform that traces every batch and verifies every handoff. Built by Sujal Tyagi as an open-source portfolio project.</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link className="hover:text-lime" href="/explorer">Explorer</Link>
          <Link className="hover:text-lime" href="/about">About</Link>
          <Link className="hover:text-lime" href="/docs">Docs</Link>
          <a className="hover:text-lime" href={githubUrl} target="_blank" rel="noreferrer">GitHub</a>
          {contractAddress && explorerUrl && <a className="hover:text-lime" href={addrLink(contractAddress)} target="_blank" rel="noreferrer">Contract</a>}
        </div>
      </div>
    </footer>
  );
}
