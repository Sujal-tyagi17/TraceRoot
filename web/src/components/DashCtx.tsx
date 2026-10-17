"use client";
import { createContext, useContext } from "react";
import type { Address } from "viem";
import type { RoleName } from "@/lib/traceroot";
import { can, type Can } from "@/lib/permissions";

export type Dash = { address?: Address; roles: RoleName[]; has: (r: RoleName) => boolean; can: Can };
export const DashContext = createContext<Dash>({ roles: [], has: () => false, can: can([]) });
export const useDash = () => useContext(DashContext);
