import { hardhat, polygonAmoy, sepolia } from "viem/chains";
import type { Address, Chain } from "viem";

// "localhost" is for development against `npx hardhat node` only.
const CHAINS: Record<string, Chain> = { amoy: polygonAmoy, sepolia, localhost: hardhat };

export const chainKey = (process.env.NEXT_PUBLIC_CHAIN || "amoy") as keyof typeof CHAINS;
export const chain: Chain = CHAINS[chainKey] ?? polygonAmoy;

const raw = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
export const contractAddress = (/^0x[0-9a-fA-F]{40}$/.test(raw) ? raw : undefined) as Address | undefined;
export const isConfigured = Boolean(contractAddress);

export const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || chain.rpcUrls.default.http[0];
export const explorerUrl = chain.blockExplorers?.default.url ?? "";
export const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/Sujal-tyagi17";

export const txLink = (h: string) => `${explorerUrl}/tx/${h}`;
export const addrLink = (a: string) => `${explorerUrl}/address/${a}`;

/** Plain-language description of the network, for badges and hints. */
export const networkLabel = chainKey === "localhost" ? "a local test chain" : `${chain.name}, a public test network`;
