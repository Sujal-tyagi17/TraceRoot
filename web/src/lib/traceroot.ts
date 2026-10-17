import { createPublicClient, http, keccak256, stringToBytes, type Address, type Hex } from "viem";
import abiJson from "./contract/abi.json";
import { chain, contractAddress, rpcUrl } from "./config";

export const abi = abiJson as typeof abiJson;
export const publicClient = createPublicClient({ chain, transport: http(rpcUrl, { batch: true, retryCount: 2 }) });

export const STATUS = ["None", "Active", "Consumed", "Sold"] as const;
export type StatusName = (typeof STATUS)[number];

export type Batch = {
  id: bigint;
  product: string;
  unit: string;
  origin: string;
  evidenceCid: string;
  quantity: bigint;
  producedAt: bigint;
  createdAt: bigint;
  producer: Address;
  custodian: Address;
  status: StatusName;
  recalled: boolean; // direct flag
  inheritedRecall: boolean; // effective recall incl. ancestors (computed on-chain)
  parents: bigint[];
  children: bigint[];
  pending?: { to: Address; expiresAt: bigint; price: bigint };
};

export type RoleName = "ADMIN" | "PRODUCER" | "TRADER" | "TRANSPORTER" | "INSPECTOR" | "RETAILER";
export const ROLES: RoleName[] = ["ADMIN", "PRODUCER", "TRADER", "TRANSPORTER", "INSPECTOR", "RETAILER"];
export const ROLE_LABEL: Record<RoleName, string> = {
  ADMIN: "Administrator",
  PRODUCER: "Producer",
  TRADER: "Trader",
  TRANSPORTER: "Transporter",
  INSPECTOR: "Inspector",
  RETAILER: "Retailer",
};

function need(): Address {
  if (!contractAddress) throw new Error("Contract address not configured");
  return contractAddress;
}

const read = <T,>(functionName: string, args: unknown[] = []) =>
  publicClient.readContract({ address: need(), abi, functionName, args } as never) as Promise<T>;

export async function batchCount(): Promise<number> {
  return Number(await read<bigint>("batchCount"));
}

/** Thrown when a batch number is beyond the last batch. Checked against batchCount, not error text. */
export class BatchNotFoundError extends Error {
  constructor(public id: bigint) { super(`BatchNotFound: batch #${id} does not exist`); this.name = "BatchNotFoundError"; }
}

export async function getBatch(id: bigint): Promise<Batch> {
  let parts: [Record<string, unknown>, boolean, [Address, bigint, bigint]];
  try {
    parts = await Promise.all([
      read<Record<string, unknown>>("getBatch", [id]),
      read<boolean>("isRecalled", [id]),
      read<[Address, bigint, bigint]>("pendingTransfer", [id]),
    ]);
  } catch (e) {
    // RPCs don't always decode the contract's custom error name, so decide "missing" from the count.
    if (id === 0n || id > BigInt(await batchCount())) throw new BatchNotFoundError(id);
    throw e;
  }
  const [b, effective, pending] = parts;
  const r = b as unknown as Omit<Batch, "id" | "status" | "inheritedRecall" | "pending"> & { status: number };
  return {
    ...r,
    id,
    status: STATUS[r.status] ?? "None",
    inheritedRecall: effective,
    pending: pending[0] !== "0x0000000000000000000000000000000000000000"
      ? { to: pending[0], expiresAt: pending[1], price: pending[2] }
      : undefined,
  };
}

export async function listBatches(limit = 60): Promise<Batch[]> {
  const n = await batchCount();
  const ids: bigint[] = [];
  for (let i = n; i >= 1 && ids.length < limit; i--) ids.push(BigInt(i));
  return Promise.all(ids.map(getBatch));
}

export async function rolesOf(account: Address): Promise<RoleName[]> {
  const out: RoleName[] = [];
  await Promise.all(
    ROLES.map(async (r) => {
      if (await read<boolean>("hasRole", [roleId(r), account])) out.push(r);
    })
  );
  return ROLES.filter((r) => out.includes(r));
}

/** Role ids are deterministic: keccak256("<NAME>_ROLE"); DEFAULT_ADMIN_ROLE is zero. */
export function roleId(r: RoleName): Hex {
  return r === "ADMIN" ? `0x${"0".repeat(64)}` : keccak256(stringToBytes(`${r}_ROLE`));
}

// ─────────────────────── History from events ───────────────────────
export type TimelineKind =
  | "created" | "proposed" | "accepted" | "cancelled" | "split" | "merged"
  | "inspection" | "condition" | "evidence" | "sold" | "recalled" | "cleared";

export type TimelineEvent = {
  kind: TimelineKind;
  block: bigint;
  logIndex: number;
  tx: Hex;
  timestamp?: number;
  actor?: Address;
  data: Record<string, unknown>;
};

const KIND: Record<string, TimelineKind> = {
  BatchCreated: "created", TransferProposed: "proposed", TransferAccepted: "accepted",
  TransferCancelled: "cancelled", BatchSplit: "split", BatchesMerged: "merged",
  InspectionRecorded: "inspection", ConditionRecorded: "condition", EvidenceAdded: "evidence",
  BatchSold: "sold", BatchRecalled: "recalled", RecallCleared: "cleared",
};

function touches(name: string, args: Record<string, unknown>, id: bigint) {
  if (name === "BatchSplit") return args.parentId === id || (args.childIds as bigint[]).includes(id);
  if (name === "BatchesMerged") return args.newBatchId === id || (args.sourceIds as bigint[]).includes(id);
  return args.batchId === id;
}

const ACTOR_FIELD: Record<string, string> = {
  BatchCreated: "producer", TransferProposed: "from", TransferAccepted: "to", TransferCancelled: "by",
  InspectionRecorded: "inspector", ConditionRecorded: "recorder", EvidenceAdded: "by",
  BatchSold: "retailer", BatchRecalled: "by", RecallCleared: "by",
};

function actorOf(name: string, a: Record<string, unknown>): Address | undefined {
  const f = ACTOR_FIELD[name];
  return f ? (a[f] as Address) : undefined;
}

export async function getHistory(id: bigint): Promise<TimelineEvent[]> {
  const blocks = await read<bigint[]>("getEventBlocks", [id]);
  const events: TimelineEvent[] = [];
  const times = new Map<bigint, number>();
  await Promise.all(
    blocks.map(async (b) => {
      const [logs, blk] = await Promise.all([
        publicClient.getContractEvents({ address: need(), abi, fromBlock: b, toBlock: b } as never),
        publicClient.getBlock({ blockNumber: b }),
      ]);
      times.set(b, Number(blk.timestamp));
      for (const l of logs as unknown as { eventName: string; args: Record<string, unknown>; blockNumber: bigint; logIndex: number; transactionHash: Hex }[]) {
        const kind = KIND[l.eventName];
        if (!kind || !touches(l.eventName, l.args, id)) continue;
        events.push({ kind, block: l.blockNumber, logIndex: l.logIndex, tx: l.transactionHash, actor: actorOf(l.eventName, l.args), data: l.args });
      }
    })
  );
  for (const e of events) e.timestamp = times.get(e.block);
  return events.sort((a, b) => (a.block === b.block ? a.logIndex - b.logIndex : a.block < b.block ? -1 : 1));
}

/** Walks parents to the roots. Returns generations oldest-first, e.g. [[#1,#2],[#4]] for #6. */
export async function getAncestors(b: Batch): Promise<Batch[][]> {
  const seen = new Set<string>();
  const levels: Batch[][] = [];
  let frontier = b.parents;
  let total = 0;
  while (frontier.length && total < 64) {
    const ids = [...new Set(frontier.map(String))].filter((x) => !seen.has(x)).map(BigInt);
    const got = await Promise.all(ids.map(getBatch));
    got.forEach((g) => seen.add(g.id.toString()));
    total += got.length;
    if (got.length) levels.unshift(got.sort((x, y) => (x.id < y.id ? -1 : 1)));
    frontier = got.flatMap((g) => g.parents);
  }
  return levels;
}
