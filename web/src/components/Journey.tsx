import { Factory, Truck, Store, Users, Split, ShieldCheck } from "lucide-react";

const STEPS = [
  { icon: Factory, role: "Producer", text: "Creates batch #1 · 100 kg", sig: "signed" },
  { icon: Truck, role: "Transporter", text: "Accepts custody · logs 4.5 °C", sig: "2-step" },
  { icon: Split, role: "Trader", text: "Splits into 40 kg + 60 kg", sig: "Σ = 100 kg" },
  { icon: ShieldCheck, role: "Inspector", text: "Grade 4 · report on IPFS", sig: "recorded" },
  { icon: Store, role: "Retailer", text: "Sells at declared price", sig: "₹ disclosed" },
  { icon: Users, role: "Consumer", text: "Scans QR — sees all of it", sig: "no wallet" },
];

export function Journey() {
  return (
    <ol className="relative grid gap-4">
      <div className="absolute left-[22px] top-4 bottom-4 w-px bg-forest/20" aria-hidden />
      {STEPS.map(({ icon: Icon, role, text, sig }, i) => (
        <li key={role} className="rise relative flex items-center gap-4" style={{ animationDelay: `${i * 70}ms` }}>
          <span className="relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full border border-forest/20 bg-paper text-forest">
            <Icon size={18} />
          </span>
          <div className="flex flex-1 items-baseline justify-between gap-3">
            <p className="text-sm"><span className="font-semibold text-forest">{role}</span> <span className="text-slate-600">· {text}</span></p>
            <p className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-forest-500">{sig}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
