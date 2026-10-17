"use client";
import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { isConfigured } from "./config";
import { SCAN_LIMIT, batchCount, getAncestors, getBatch, getHistory, listBatches, publicClient, rolesOf } from "./traceroot";

export const useBatches = (limit = SCAN_LIMIT) =>
  useQuery({ queryKey: ["batches", limit], queryFn: () => listBatches(limit), enabled: isConfigured });

/** Total batches ever created, straight from the contract (not limited by SCAN_LIMIT). */
export const useBatchCount = () =>
  useQuery({ queryKey: ["batchCount"], queryFn: batchCount, enabled: isConfigured });

export const useBatch = (id?: bigint) =>
  useQuery({ queryKey: ["batch", id?.toString()], queryFn: () => getBatch(id!), enabled: isConfigured && id !== undefined });

export const useHistory = (id?: bigint) =>
  useQuery({ queryKey: ["history", id?.toString()], queryFn: () => getHistory(id!), enabled: isConfigured && id !== undefined });

export const useRoles = (a?: Address) =>
  useQuery({ queryKey: ["roles", a], queryFn: () => rolesOf(a!), enabled: isConfigured && !!a });

export const useAncestors = (b?: Awaited<ReturnType<typeof getBatch>>) =>
  useQuery({ queryKey: ["ancestors", b?.id.toString()], queryFn: () => getAncestors(b!), enabled: !!b && b.parents.length > 0 });

export const useChildren = (b?: Awaited<ReturnType<typeof getBatch>>) =>
  useQuery({
    queryKey: ["children", b?.id.toString(), b?.children.length],
    queryFn: () => Promise.all(b!.children.map(getBatch)),
    enabled: !!b && b.children.length > 0,
  });

/** Current time as the chain sees it (latest block), so offer expiry matches what the contract will enforce. */
export const useChainNow = () => {
  const q = useQuery({
    queryKey: ["chainNow"],
    queryFn: async () => Number((await publicClient.getBlock({ blockTag: "latest" })).timestamp),
    enabled: isConfigured,
    refetchInterval: 30_000,
  });
  return q.data ?? Math.floor(Date.now() / 1000);
};
