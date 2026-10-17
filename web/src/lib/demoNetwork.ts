/**
 * Illustrative supply-chain network used by the Origin Sequence and the landing hero.
 * EXAMPLE DATA ONLY — not read from the blockchain, never shown as live records.
 */
export type DemoKind = "origin" | "stage" | "parent" | "child" | "shop";
export type DemoNode = {
  id: string;
  label: string;
  sub: string;
  kind: DemoKind;
  parents: string[];
  desc: string;
};

export const DEMO_NODES: DemoNode[] = [
  { id: "origin", label: "Origin farm", sub: "Karnal, Haryana", kind: "origin", parents: [], desc: "Where the story starts. The producer registers the lot here with its quantity, place and harvest date." },
  { id: "producer", label: "Producer", sub: "harvests 100 kg", kind: "stage", parents: ["origin"], desc: "The producer signs the first record. From now on every change of hands needs two signatures." },
  { id: "trader", label: "Trader", sub: "Lot A, 100 kg", kind: "parent", parents: ["producer"], desc: "The trader accepts the handoff, then splits Lot A for two buyers. Lot A is used up by the split." },
  { id: "lotB", label: "Lot B", sub: "40 kg", kind: "child", parents: ["trader"], desc: "A child batch. It keeps Lot A's origin and history, so it can always be traced back." },
  { id: "lotC", label: "Lot C", sub: "60 kg", kind: "child", parents: ["trader"], desc: "The other child batch. Together with Lot B it adds up to exactly 100 kg, which the contract checks." },
  { id: "transporter", label: "Transporter", sub: "cold truck, 4 °C", kind: "stage", parents: ["lotB"], desc: "The transporter accepts custody of Lot B and logs temperature readings on the way." },
  { id: "inspector", label: "Inspector", sub: "grade 4 of 5", kind: "stage", parents: ["lotC"], desc: "An inspector records a grade for Lot C and attaches the report. It's a signed declaration, not a lab result." },
  { id: "shopA", label: "Retailer", sub: "Delhi", kind: "shop", parents: ["transporter"], desc: "The retailer confirms receipt and prints a QR code. Shoppers scan it to read this whole journey." },
  { id: "shopB", label: "Retailer", sub: "Mumbai", kind: "shop", parents: ["inspector"], desc: "A second shop receives Lot C. A recall at the farm would reach this shelf too." },
];

export const DEMO_EDGES: [string, string][] = DEMO_NODES.flatMap((n) => n.parents.map((p) => [p, n.id] as [string, string]));
const byId = new Map(DEMO_NODES.map((n) => [n.id, n]));
export const demoNode = (id: string) => byId.get(id)!;

/** Every node above `id` (its ancestors). */
export function ancestorsOf(id: string): Set<string> {
  const out = new Set<string>();
  const walk = (x: string) => demoNode(x).parents.forEach((p) => { if (!out.has(p)) { out.add(p); walk(p); } });
  walk(id);
  return out;
}

/** Every node below `id` (its descendants). */
export function descendantsOf(id: string): Set<string> {
  const out = new Set<string>();
  const walk = (x: string) => DEMO_NODES.filter((n) => n.parents.includes(x)).forEach((c) => { if (!out.has(c.id)) { out.add(c.id); walk(c.id); } });
  walk(id);
  return out;
}

/** Depth from the origin (0 = origin). Used for animation timing. */
export function depthOf(id: string): number {
  const ps = demoNode(id).parents;
  return ps.length ? 1 + Math.max(...ps.map(depthOf)) : 0;
}

export const CONSERVATION = "100 kg = 40 kg + 60 kg";
