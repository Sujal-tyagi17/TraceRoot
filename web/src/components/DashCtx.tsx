"use client";
import { createContext, useContext } from "react";
import type { Address } from "viem";
import type { RoleName } from "@/lib/traceroot";

export type Dash = { address?: Address; roles: RoleName[]; has: (r: RoleName) => boolean };
export const DashContext = createContext<Dash>({ roles: [], has: () => false });
export const useDash = () => useContext(DashContext);
