// Usage: ROLE=PRODUCER ACCOUNT=0x... npx hardhat run scripts/grant-roles.js --network amoy
const { ethers, network } = require("hardhat");
const m = require(`../deployments/${network.name}.json`);
async function main() {
  const { ROLE, ACCOUNT } = process.env;
  if (!ROLE || !ACCOUNT) throw new Error("Set ROLE (PRODUCER|TRADER|TRANSPORTER|INSPECTOR|RETAILER) and ACCOUNT");
  const c = await ethers.getContractAt("TraceRoot", m.address);
  const role = await c[`${ROLE}_ROLE`]();
  const tx = await c.grantRole(role, ACCOUNT);
  await tx.wait();
  console.log(`Granted ${ROLE} to ${ACCOUNT}: ${tx.hash}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
