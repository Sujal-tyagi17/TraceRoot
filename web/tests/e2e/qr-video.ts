import fs from "fs";
import path from "path";
import QRCode from "qrcode";

/**
 * Writes a short Y4M video showing a QR code, for Chromium's fake camera
 * (--use-file-for-fake-video-capture). Grey-scale: luma carries the code, chroma is neutral.
 */
export function makeQrVideo(text: string, file: string) {
  const W = 640, H = 480;
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = qr.modules.size, scale = Math.floor(460 / (n + 8)), size = (n + 8) * scale; // fill most of the 480 px frame
  const x0 = Math.floor((W - size) / 2), y0 = Math.floor((H - size) / 2);
  const Y = Buffer.alloc(W * H, 235); // light background
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!qr.modules.get(r, c)) continue;
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++)
      Y[(y0 + (r + 4) * scale + dy) * W + x0 + (c + 4) * scale + dx] = 16;
  }
  const UV = Buffer.alloc((W / 2) * (H / 2), 128);
  const frame = Buffer.concat([Buffer.from("FRAME\n"), Y, UV, UV]);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.concat([Buffer.from(`YUV4MPEG2 W${W} H${H} F10:1 Ip A1:1 C420jpeg\n`), ...Array(10).fill(frame)]));
  return file;
}
