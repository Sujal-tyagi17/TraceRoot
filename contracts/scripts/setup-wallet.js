// LOCAL ONLY: give any MetaMask address a TraceRoot role and 100 test ETH on the Hardhat node.
// PowerShell:  $env:ROLE="TRADER"; $env:ACCOUNT="0xYourAddress"; npm run setup:wallet
const { ethers, network } = require("hardhat");
const m = require(`../deployments/${network.name}.json`);

async function main() {
  if (network.name !== "localhost") throw new Error("setup-wallet only runs against localhost");
  const { ROLE, ACCOUNT } = process.env;
  const roles = ["PRODUCER", "TRADER", "TRANSPORTER", "INSPECTOR", "RETAILER", "ADMIN"];
  if (!roles.includes(ROLE || "")) throw new Error(`Set ROLE to one of ${roles.join(", ")}`);
  if (!ethers.isAddress(ACCOUNT || "")) throw new Error("Set ACCOUNT to a 0x… address");
  const to = ethers.getAddress(ACCOUNT.toLowerCase());
  const [admin] = await ethers.getSigners();
  const c = await ethers.getContractAt("TraceRoot", m.address);
  const role = ROLE === "ADMIN" ? await c.DEFAULT_ADMIN_ROLE() : await c[`${ROLE}_ROLE`]();

  await (await admin.sendTransaction({ to, value: ethers.parseEther("100") })).wait();
  if (!(await c.hasRole(role, to))) await (await c.grantRole(role, to)).wait();
  console.log(`✔ ${to} now has ${ROLE} and 100 test ETH on contract ${m.address}`);
}
main().catch((e) => { console.error(e.message || e); process.exit(1); });
