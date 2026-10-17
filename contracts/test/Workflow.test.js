// A realistic journey through every stage, checking contract state AND emitted events at each step.
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const Status = { None: 0n, Active: 1n, Consumed: 2n, Sold: 3n };
const ZERO = ethers.ZeroAddress;

async function deploy() {
  const [admin, producer, trader, transporter, inspector, retailer, outsider] = await ethers.getSigners();
  const tr = await (await ethers.getContractFactory("TraceRoot")).deploy(admin.address);
  const role = async (name) => tr[`${name}_ROLE`]();
  await tr.grantRole(await role("PRODUCER"), producer.address);
  await tr.grantRole(await role("TRADER"), trader.address);
  await tr.grantRole(await role("TRANSPORTER"), transporter.address);
  await tr.grantRole(await role("INSPECTOR"), inspector.address);
  await tr.grantRole(await role("RETAILER"), retailer.address);
  return { tr, admin, producer, trader, transporter, inspector, retailer, outsider };
}

/** Rebuilds a batch's history the way the website does: exact-block log queries from getEventBlocks. */
async function historyOf(tr, id) {
  const blocks = await tr.getEventBlocks(id);
  const names = [];
  for (const b of blocks) {
    const logs = await ethers.provider.getLogs({ address: await tr.getAddress(), fromBlock: Number(b), toBlock: Number(b) });
    for (const l of logs) {
      const e = tr.interface.parseLog(l);
      const a = e.args;
      const touches = e.name === "BatchSplit" ? a.parentId === id || a.childIds.includes(id)
        : e.name === "BatchesMerged" ? a.newBatchId === id || a.sourceIds.includes(id)
        : a.batchId === id;
      if (touches) names.push(e.name);
    }
  }
  return names;
}

describe("End-to-end workflow (contract level)", () => {
  it("producer → trader → split → transporter → inspector → retailer → sold → recall → clear", async () => {
    const { tr, admin, producer, trader, transporter, inspector, retailer } = await loadFixture(deploy);
    const produced = (await time.latest()) - 3 * 86400;

    // 1. Producer creates the origin batch.
    await expect(tr.connect(producer).createBatch("Basmati rice", 100n, "kg", "Karnal, Haryana", produced, "bafyorigin"))
      .to.emit(tr, "BatchCreated").withArgs(1n, producer.address, "Basmati rice", 100n, "kg", "Karnal, Haryana", produced, "bafyorigin");
    let b1 = await tr.getBatch(1n);
    expect(b1.custodian).to.equal(producer.address);
    expect(b1.status).to.equal(Status.Active);

    // 2. Trader receives it. While the offer is pending, custody does NOT move.
    await expect(tr.connect(producer).proposeTransfer(1n, trader.address, 1_600_000n)).to.emit(tr, "TransferProposed");
    expect((await tr.getBatch(1n)).custodian).to.equal(producer.address);
    expect((await tr.pendingTransfer(1n)).to).to.equal(trader.address);
    await expect(tr.connect(trader).acceptTransfer(1n))
      .to.emit(tr, "TransferAccepted").withArgs(1n, producer.address, trader.address, 1_600_000n);
    expect((await tr.getBatch(1n)).custodian).to.equal(trader.address);
    expect((await tr.pendingTransfer(1n)).to).to.equal(ZERO);

    // 3. Trader splits 100 kg into 40 + 60; quantity is conserved exactly.
    await expect(tr.connect(trader).splitBatch(1n, [40n, 60n])).to.emit(tr, "BatchSplit").withArgs(1n, [2n, 3n], [40n, 60n]);
    b1 = await tr.getBatch(1n);
    const [b2, b3] = [await tr.getBatch(2n), await tr.getBatch(3n)];
    expect(b1.status).to.equal(Status.Consumed);
    expect(b1.children).to.deep.equal([2n, 3n]);
    expect(b2.quantity + b3.quantity).to.equal(b1.quantity);
    for (const c of [b2, b3]) {
      expect(c.parents).to.deep.equal([1n]);
      expect(c.product).to.equal("Basmati rice");
      expect(c.origin).to.equal("Karnal, Haryana");
      expect(c.producer).to.equal(producer.address); // original producer is kept
      expect(c.custodian).to.equal(trader.address);
      expect(c.producedAt).to.equal(BigInt(produced));
    }

    // 4. Transporter receives #2, logs the cold chain, and hands it on to the retailer.
    await tr.connect(trader).proposeTransfer(2n, transporter.address, 0n);
    await tr.connect(transporter).acceptTransfer(2n);
    await expect(tr.connect(transporter).recordCondition(2n, 45, 620, "Reefer truck"))
      .to.emit(tr, "ConditionRecorded").withArgs(2n, transporter.address, 45, 620, "Reefer truck");
    await tr.connect(transporter).proposeTransfer(2n, retailer.address, 720_000n);
    await tr.connect(retailer).acceptTransfer(2n);
    expect((await tr.getBatch(2n)).custodian).to.equal(retailer.address);

    // 5. Inspector grades #3 (inspectors don't need custody).
    await expect(tr.connect(inspector).recordInspection(3n, 4, "bafyreport", "Moisture 12%"))
      .to.emit(tr, "InspectionRecorded").withArgs(3n, inspector.address, 4, "bafyreport", "Moisture 12%");
    await tr.connect(trader).proposeTransfer(3n, retailer.address, 1_080_000n);
    await tr.connect(retailer).acceptTransfer(3n);

    // 6. Retailer sells #2.
    await expect(tr.connect(retailer).markSold(2n, 960_000n)).to.emit(tr, "BatchSold").withArgs(2n, retailer.address, 960_000n);
    expect((await tr.getBatch(2n)).status).to.equal(Status.Sold);

    // 7. Inspector recalls the ORIGIN batch after the split and the sale.
    await expect(tr.connect(inspector).recallBatch(1n, "Pesticide residue")).to.emit(tr, "BatchRecalled").withArgs(1n, inspector.address, "Pesticide residue");

    // 8. Every descendant shows the inherited recall, including the already-sold #2.
    expect(await tr.isRecalled(1n)).to.equal(true);
    expect(await tr.isRecalled(2n)).to.equal(true);
    expect(await tr.isRecalled(3n)).to.equal(true);
    expect((await tr.getBatch(2n)).recalled).to.equal(false); // inherited, not direct
    expect((await tr.getBatch(2n)).status).to.equal(Status.Sold); // recall doesn't rewrite history
    await expect(tr.connect(retailer).markSold(3n, 1n)).to.be.revertedWithCustomError(tr, "BatchIsRecalled");

    // History survives status changes and is complete and ordered for the sold child.
    expect(await historyOf(tr, 2n)).to.deep.equal([
      "BatchSplit", "TransferProposed", "TransferAccepted", "ConditionRecorded", "TransferProposed", "TransferAccepted", "BatchSold",
    ]);
    expect(await historyOf(tr, 1n)).to.deep.equal(["BatchCreated", "TransferProposed", "TransferAccepted", "BatchSplit", "BatchRecalled"]);

    // Only the administrator can clear; afterwards #3 can be sold again.
    await expect(tr.connect(inspector).clearRecall(1n, "Retest passed")).to.be.revertedWithCustomError(tr, "AccessControlUnauthorizedAccount");
    await tr.connect(admin).clearRecall(1n, "Retest passed");
    expect(await tr.isRecalled(3n)).to.equal(false);
    await tr.connect(retailer).markSold(3n, 1_200_000n);
    expect((await tr.getBatch(3n)).status).to.equal(Status.Sold);
  });
});
