"use client";
import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { isConfigured } from "./config";
import { getAncestors, getBatch, getHistory, listBatches, rolesOf } from "./traceroot";

export const useBatches = (limit = 60) =>
  useQuery({ queryKey: ["batches", limit], queryFn: () => listBatches(limit), enabled: isConfigured });

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
