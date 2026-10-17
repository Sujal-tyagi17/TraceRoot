// Seeds a local Hardhat node with a realistic multi-party journey (uses Hardhat's test accounts).
// Usage: npx hardhat node  (terminal 1)  →  npm run deploy:local && npm run seed:local
const { ethers, network } = require("hardhat");
const m = require(`../deployments/${network.name}.json`);

async function main() {
  if (network.name !== "localhost") throw new Error("seed-local only runs against localhost");
  const [admin, farmer, farmer2, transporter, trader, inspector, retailer] = await ethers.getSigners();
  const c = await ethers.getContractAt("TraceRoot", m.address);
  const g = async (r, a) => (await c.grantRole(await c[`${r}_ROLE`](), a.address)).wait();
  await g("PRODUCER", farmer); await g("PRODUCER", farmer2); await g("TRANSPORTER", transporter);
  await g("TRADER", trader); await g("INSPECTOR", inspector); await g("RETAILER", retailer);
  const day = 86400, now = Math.floor(Date.now() / 1000);
  const w = async (p) => (await p).wait();

  await w(c.connect(farmer).createBatch("Basmati rice", 1000, "kg", "Karnal, Haryana", now - 9 * day, ""));
  await w(c.connect(farmer2).createBatch("Basmati rice", 400, "kg", "Kaithal, Haryana", now - 8 * day, ""));
  await w(c.connect(farmer).createBatch("Arabica coffee beans", 250, "kg", "Chikmagalur, Karnataka", now - 20 * day, ""));

  await w(c.connect(farmer).proposeTransfer(1, transporter.address, 0)); await w(c.connect(transporter).acceptTransfer(1));
  await w(c.connect(transporter).recordCondition(1, 285, 610, "Covered truck, Karnal → Delhi"));
  await w(c.connect(transporter).proposeTransfer(1, trader.address, 6500000)); await w(c.connect(trader).acceptTransfer(1));
  await w(c.connect(farmer2).proposeTransfer(2, trader.address, 2700000)); await w(c.connect(trader).acceptTransfer(2));
  await w(c.connect(inspector).recordInspection(1, 4, "", "Moisture 12.1%, broken grains 3%"));
  await w(c.connect(trader).mergeBatches([1, 2]));            // → #4 (1400 kg)
  await w(c.connect(trader).splitBatch(4, [600, 800]));       // → #5, #6
  await w(c.connect(trader).proposeTransfer(5, retailer.address, 5400000)); await w(c.connect(retailer).acceptTransfer(5));
  await w(c.connect(retailer).markSold(5, 7200000));
  await w(c.connect(farmer).proposeTransfer(3, trader.address, 9000000)); await w(c.connect(trader).acceptTransfer(3));
  await w(c.connect(inspector).recordInspection(3, 2, "", "Mould spots on sample"));
  await w(c.connect(inspector).recallBatch(3, "Mould contamination found in sample"));
  await w(c.connect(trader).proposeTransfer(6, retailer.address, 7000000));
  console.log("Seeded. Batches:", (await c.batchCount()).toString());
}
main().catch((e) => { console.error(e); process.exit(1); });
