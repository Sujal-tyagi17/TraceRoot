import type { Page } from "@playwright/test";

/** Hardhat's well-known test accounts (public keys, local chain only), as seeded by seed-local.js. */
export const ACCOUNTS = {
  admin: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  producer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  transporter: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  trader: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
  inspector: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
  retailer: "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
  noRole: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
};

/** Injects a minimal EIP-1193 wallet that forwards to the local node, where accounts are unlocked. */
export async function injectWallet(page: Page, account: string, chainIdHex = "0x7a69") {
  await page.addInitScript(([acct, chainHex]) => {
    const rpc = async (method: string, params: unknown[] = []) => {
      const r = await fetch("http://127.0.0.1:8545", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
      const j = await r.json();
      if (j.error) throw j.error;
      return j.result;
    };
    (window as unknown as { ethereum: unknown }).ethereum = {
      isMetaMask: true,
      request: async ({ method, params }: { method: string; params?: unknown[] }) => {
        if (method === "eth_requestAccounts" || method === "eth_accounts") return [acct];
        if (method === "eth_chainId") return chainHex;
        if (method.startsWith("wallet_")) return null;
        return rpc(method, params);
      },
      on: () => {}, removeListener: () => {},
    };
  }, [account, chainIdHex] as const);
}

export async function connect(page: Page) {
  await page.getByRole("button", { name: /Connect/ }).first().click();
}
