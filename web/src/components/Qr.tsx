"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download } from "lucide-react";

export function Qr({ id }: { id: string }) {
  const [src, setSrc] = useState<string>();
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = `${window.location.origin}/batch/${id}`;
    setUrl(u);
    QRCode.toDataURL(u, { margin: 1, width: 320, color: { dark: "#173B2A", light: "#FFFFFF" } }).then(setSrc);
  }, [id]);
  return (
    <div className="flex flex-col items-center gap-2">
      {src ? <img src={src} alt={`QR code for batch ${id}`} className="h-40 w-40 rounded-lg border border-paper-300" /> : <div className="h-40 w-40 rounded-lg bg-paper-200" />}
      {src && (
        <a href={src} download={`traceroot-batch-${id}.png`} className="inline-flex items-center gap-1 text-xs text-forest underline">
          <Download size={12} /> Download QR
        </a>
      )}
      <span className="max-w-[160px] truncate font-mono text-[10px] text-slate-400">{url}</span>
    </div>
  );
}
