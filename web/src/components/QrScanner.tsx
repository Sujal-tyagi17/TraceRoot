"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Camera, CameraOff, ScanLine, X } from "lucide-react";
import type { IScannerControls } from "@zxing/browser";
import { parseScan } from "@/lib/scan";
import { isConfigured } from "@/lib/config";
import { batchCount } from "@/lib/traceroot";
import { RootLoader } from "./Loader";
import { inputCls } from "./ui";

type Phase =
  | { s: "starting" }
  | { s: "scanning" }
  | { s: "checking"; id: string }
  | { s: "foreign"; id: string; host: string }
  | { s: "blocked"; why: "denied" | "nocamera" | "insecure" | "unsupported" | "error"; detail?: string };

const BLOCKED: Record<Extract<Phase, { s: "blocked" }>["why"], string> = {
  denied: "Camera access was blocked. You can allow it in your browser's site settings, or type the batch number below.",
  nocamera: "No camera was found on this device. Type the batch number from the label instead.",
  insecure: "The camera only works on a secure (https) page. Type the batch number below instead.",
  unsupported: "This browser can't use the camera for scanning. Type the batch number below instead.",
  error: "The camera couldn't start. Close other apps using it, or type the batch number below.",
};

/** Button that opens the scanner. The camera is only requested after the user presses it. */
export function ScanButton({ className = "", label = "Scan a QR code" }: { className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={btn} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={className}>
        <ScanLine size={16} aria-hidden /> <span>{label}</span>
      </button>
      {/* Portalled to <body>: an animated (transformed) ancestor would otherwise trap the fixed overlay inside it. */}
      {open && createPortal(<ScannerDialog onClose={() => { setOpen(false); btn.current?.focus(); }} />, document.body)}
    </>
  );
}

function ScannerDialog({ onClose: onCloseProp }: { onClose: () => void }) {
  const closeRef = useRef(onCloseProp);
  useEffect(() => { closeRef.current = onCloseProp; }, [onCloseProp]);
  const onClose = useCallback(() => closeRef.current(), []);
  const router = useRouter();
  const titleId = useId();
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const handled = useRef(false);
  const stopped = useRef(false);
  const [phase, setPhase] = useState<Phase>({ s: "starting" });
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  const [notice, setNotice] = useState<string>();
  const [manual, setManual] = useState("");

  const stop = useCallback(() => {
    stopped.current = true;
    controls.current?.stop();
    controls.current = null;
    const stream = video.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (video.current) video.current.srcObject = null;
  }, []);

  const close = useCallback(() => { stop(); onClose(); }, [stop, onClose]);

  /** Checks the batch exists on-chain, then opens it. */
  const openBatch = useCallback(async (id: string) => {
    if (!isConfigured) { setNotice("This site isn't connected to a contract yet, so batches can't be looked up."); return false; }
    // Whatever was showing before (camera, or the "camera blocked" message) comes back if the check fails.
    const before: Phase = phaseRef.current.s === "checking" ? { s: "scanning" } : phaseRef.current;
    setPhase({ s: "checking", id });
    try {
      const n = await batchCount();
      if (Number(id) > n) { setNotice(n ? `There's no batch #${id} yet. The newest is #${n}.` : "No batches have been created yet."); setPhase(before); return false; }
      stop();
      router.push(`/batch/${id}`);
      onClose();
      return true;
    } catch {
      setNotice("Couldn't reach the blockchain. Check your connection and try again.");
      setPhase(before);
      return false;
    }
  }, [router, stop, onClose]);

  const onDecoded = useCallback(async (text: string) => {
    if (handled.current) return;
    const r = parseScan(text, window.location.origin);
    if (r.kind === "invalid") { setNotice(`${r.reason} Keep scanning, or type the number below.`); return; }
    handled.current = true;
    // Stop the camera after the decoder's callback returns; stopping inside it interrupts the library mid-frame.
    if (r.kind === "foreign") { setPhase({ s: "foreign", id: r.id, host: r.host }); setTimeout(stop, 0); return; }
    const ok = await openBatch(r.id);
    if (!ok) { handled.current = false; setPhase({ s: "scanning" }); }
  }, [openBatch, stop]);

  // Latest decode handler, read through a ref so the camera effect below runs exactly once.
  const onDecodedRef = useRef(onDecoded);
  useEffect(() => { onDecodedRef.current = onDecoded; }, [onDecoded]);

  // Start the camera once, when the dialog opens. Stopped on close, unmount, or leaving the page.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!window.isSecureContext) return setPhase({ s: "blocked", why: "insecure" });
      if (!navigator.mediaDevices?.getUserMedia) return setPhase({ s: "blocked", why: "unsupported" });
      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        if (cancelled || !video.current) return;
        const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 150 });
        const c = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
          video.current,
          (result) => { if (result) void onDecodedRef.current(result.getText()); },
        );
        // A code can be decoded before this promise resolves; don't undo what that decode did.
        if (cancelled || stopped.current) { c.stop(); return; }
        controls.current = c;
        setPhase((p) => (p.s === "starting" ? { s: "scanning" } : p));
      } catch (e) {
        if (cancelled) return;
        const name = (e as { name?: string })?.name;
        setPhase({ s: "blocked", why: name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotFoundError" || name === "OverconstrainedError" ? "nocamera" : name === "NotSupportedError" ? "unsupported" : "error", detail: name });
      }
    })();
    const hide = () => { if (document.visibilityState === "hidden") stop(); };
    window.addEventListener("pagehide", stop);
    document.addEventListener("visibilitychange", hide);
    return () => { cancelled = true; stop(); window.removeEventListener("pagehide", stop); document.removeEventListener("visibilitychange", hide); };
  }, [stop]);

  // Escape closes; body doesn't scroll behind the dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [close]);

  const submitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = parseScan(manual, window.location.origin);
    if (r.kind === "invalid") return setNotice("Enter a batch number like 7, or paste a TraceRoot batch link.");
    await openBatch(r.id);
  };

  const camOff = phase.s === "blocked" || phase.s === "foreign";

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-forest-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={close}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}
        className="rise-in w-full max-w-md rounded-t-2xl border border-paper-300 bg-surface p-5 shadow-lift sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="font-display text-xl font-[650] tracking-tight text-ink">Scan a product label</h2>
            <p className="mt-0.5 text-sm text-slate-600">Point your camera at the TraceRoot QR code.</p>
          </div>
          <button type="button" onClick={close} aria-label="Close scanner" autoFocus className="press grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-600 hover:bg-paper-200 hover:text-ink"><X size={18} /></button>
        </div>

        <div className="relative mt-4 aspect-square w-full overflow-hidden rounded-xl bg-forest-900">
          <video ref={video} muted playsInline aria-label="Camera preview" className={`h-full w-full object-cover ${camOff ? "hidden" : ""}`} />
          {!camOff && (
            <div aria-hidden className="pointer-events-none absolute inset-[18%] rounded-2xl border-2 border-lime/90 shadow-[0_0_0_999px_rgba(14,42,30,.35)]" />
          )}
          {phase.s === "starting" && <div className="absolute inset-0 grid place-items-center text-sm text-cream"><span className="flex flex-col items-center gap-2"><Camera size={22} aria-hidden /> Asking for camera access…</span></div>}
          {phase.s === "checking" && <div className="absolute inset-0 grid place-items-center bg-forest-900/70 text-sm text-cream"><span className="flex items-center gap-2"><RootLoader size={18} label="Checking batch" /> Checking batch #{phase.id}…</span></div>}
          {phase.s === "blocked" && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-cream">
              <span className="flex flex-col items-center gap-2"><CameraOff size={24} aria-hidden /><span role="alert">{BLOCKED[phase.why]}</span></span>
            </div>
          )}
          {phase.s === "foreign" && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-cream">
              <div role="alert">
                <p>This label links to batch #{phase.id} on <b className="break-all">{phase.host}</b>, a different site.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button type="button" onClick={() => openBatch(phase.id)} className="press rounded-full bg-lime px-4 py-2 font-semibold text-forest">Open batch #{phase.id} here</button>
                  <button type="button" onClick={close} className="press rounded-full border border-cream/30 px-4 py-2 text-cream">Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="mt-3 min-h-[1.25rem] text-sm text-danger" role="status" aria-live="polite">{notice}</p>

        <form onSubmit={submitManual} className="mt-2 flex gap-2" noValidate>
          <label className="sr-only" htmlFor={`${titleId}-manual`}>Batch number</label>
          <input id={`${titleId}-manual`} className={inputCls} inputMode="numeric" placeholder="Or type a batch number" value={manual} onChange={(e) => { setManual(e.target.value); setNotice(undefined); }} />
          <button className="press shrink-0 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-hover">Open</button>
        </form>
      </div>
    </div>
  );
}
