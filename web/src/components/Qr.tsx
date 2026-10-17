"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download } from "lucide-react";

export function Qr({ id }: { id: string }) {
  const [src, setSrc] = useState<string>();
    useEffect(() => {
    const u = `${window.location.origin}/batch/${id}`;
    QRCode.toDataURL(u, { margin: 1, width: 320, color: { dark: "#173B2A", light: "#FFFFFF" } }).then(setSrc);
  }, [id]);
  return (
    <div className="flex flex-col items-center gap-2">
      {src ? <img src={src} alt={`QR code for batch ${id}`} className="h-36 w-36 rounded-xl bg-surface p-1.5" /> : <div className="h-36 w-36 rounded-xl bg-paper-200" />}
      {src && (
        <a href={src} download={`traceroot-batch-${id}.png`} className="inline-flex items-center gap-1 text-xs font-medium text-ink underline decoration-forest/30 underline-offset-4">
          <Download size={12} /> Download QR
        </a>
      )}
      
    </div>
  );
}
