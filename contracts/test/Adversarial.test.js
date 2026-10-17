// Boundary values, repeated operations, unauthorized callers and other adversarial cases.
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const Status = { None: 0n, Active: 1n, Consumed: 2n, Sold: 3n };
const U128_MAX = (1n << 128n) - 1n;

async function deploy() {
  const [admin, producer, trader, transporter, inspector, retailer, outsider, trader2] = await ethers.getSigners();
  const tr = await (await ethers.getContractFactory("TraceRoot")).deploy(admin.address);
  const R = {};
  for (const n of ["PRODUCER", "TRADER", "TRANSPORTER", "INSPECTOR", "RETAILER"]) R[n] = await tr[`${n}_ROLE`]();
  await tr.grantRole(R.PRODUCER, producer.address);
  await tr.grantRole(R.TRADER, trader.address);
  await tr.grantRole(R.TRADER, trader2.address);
  await tr.grantRole(R.TRANSPORTER, transporter.address);
  await tr.grantRole(R.INSPECTOR, inspector.address);
  await tr.grantRole(R.RETAILER, retailer.address);
  const yesterday = (await time.latest()) - 86400;
  // Ids come from the contract: loadFixture resets chain state between tests, not JavaScript variables.
  const create = async (qty = 100n, product = "Rice", unit = "kg", by = producer) => {
    await tr.connect(by).createBatch(product, qty, unit, "Origin", yesterday, "");
    return tr.batchCount();
  };
  const give = async (id, from, to) => { await tr.connect(from).proposeTransfer(id, to.address, 0n); await tr.connect(to).acceptTransfer(id); };
  return { tr, R, admin, producer, trader, transporter, inspector, retailer, outsider, trader2, create, give, yesterday };
}

describe("Adversarial and boundary cases", () => {
  describe("repeated operations", () => {
    it("an accepted handoff cannot be accepted or cancelled again", async () => {
      const { tr, producer, trader, create } = await loadFixture(deploy);
      const id = await create();
      await tr.connect(producer).proposeTransfer(id, trader.address, 0n);
      await tr.connect(trader).acceptTransfer(id);
      await expect(tr.connect(trader).acceptTransfer(id)).to.be.revertedWithCustomError(tr, "NoPendingTransfer");
      await expect(tr.connect(trader).cancelTransfer(id)).to.be.revertedWithCustomError(tr, "NoPendingTransfer");
    });

    it("a cancelled offer cannot be accepted; a declined offer leaves custody unchanged", async () => {
      const { tr, producer, trader, create } = await loadFixture(deploy);
      const id = await create();
      await tr.connect(producer).proposeTransfer(id, trader.address, 0n);
      await expect(tr.connect(trader).cancelTransfer(id)).to.emit(tr, "TransferCancelled").withArgs(id, trader.address);
      await expect(tr.connect(trader).acceptTransfer(id)).to.be.revertedWithCustomError(tr, "NoPendingTransfer");
      expect((await tr.getBatch(id)).custodian).to.equal(producer.address);
    });

    it("a sold batch can't be sold, moved or split again", async () => {
      const { tr, producer, retailer, trader, create, give } = await loadFixture(deploy);
      const id = await create();
      await give(id, producer, retailer);
      await tr.connect(retailer).markSold(id, 0n);
      await expect(tr.connect(retailer).markSold(id, 0n)).to.be.revertedWithCustomError(tr, "NotActive");
      await expect(tr.connect(retailer).proposeTransfer(id, trader.address, 0n)).to.be.revertedWithCustomError(tr, "NotActive");
      await expect(tr.connect(retailer).splitBatch(id, [50n, 50n])).to.be.revertedWithCustomError(tr, "NotActive");
    });

    it("a batch can't be recalled twice; clearing a non-recalled batch fails", async () => {
      const { tr, admin, create } = await loadFixture(deploy);
      const id = await create();
      await tr.recallBatch(id, "x");
      await expect(tr.recallBatch(id, "x")).to.be.revertedWithCustomError(tr, "AlreadyRecalled");
      await tr.connect(admin).clearRecall(id, "ok");
      await expect(tr.connect(admin).clearRecall(id, "ok")).to.be.revertedWithCustomError(tr, "NotRecalled");
    });

    it("an expired offer still blocks the batch until either side cancels, then a new offer works", async () => {
      const { tr, producer, trader, trader2, create } = await loadFixture(deploy);
      const id = await create();
      await tr.connect(producer).proposeTransfer(id, trader.address, 0n);
      await time.increase(7 * 86400 + 1);
      await expect(tr.connect(trader).acceptTransfer(id)).to.be.revertedWithCustomError(tr, "TransferExpired");
      await expect(tr.connect(producer).proposeTransfer(id, trader2.address, 0n)).to.be.revertedWithCustomError(tr, "TransferPending");
      await tr.connect(trader).cancelTransfer(id); // the recipient can clear it too
      await tr.connect(producer).proposeTransfer(id, trader2.address, 0n);
      await tr.connect(trader2).acceptTransfer(id);
      expect((await tr.getBatch(id)).custodian).to.equal(trader2.address);
    });
  });

  describe("unauthorized callers", () => {
    it("outsiders can't create, move, split, merge, inspect, sell or recall", async () => {
      const { tr, outsider, trader, create } = await loadFixture(deploy);
      const id = await create();
      const o = tr.connect(outsider);
      await expect(o.createBatch("x", 1n, "kg", "o", 1n, "")).to.be.revertedWithCustomError(tr, "AccessControlUnauthorizedAccount");
      await expect(o.proposeTransfer(id, trader.address, 0n)).to.be.revertedWithCustomError(tr, "NotCustodian");
      await expect(o.splitBatch(id, [50n, 50n])).to.be.revertedWithCustomError(tr, "NotCustodian"); // custody is checked first
      await expect(o.mergeBatches([id, id])).to.be.revertedWithCustomError(tr, "NotParticipant");
      await expect(o.recordInspection(id, 3, "", "")).to.be.revertedWithCustomError(tr, "AccessControlUnauthorizedAccount");
      await expect(o.markSold(id, 0n)).to.be.revertedWithCustomError(tr, "NotCustodian");
      await expect(o.recallBatch(id, "x")).to.be.revertedWithCustomError(tr, "NotParticipant");
      await expect(o.addEvidence(id, "photo", "bafy")).to.be.revertedWithCustomError(tr, "NotCustodian");
      await expect(o.pause()).to.be.revertedWithCustomError(tr, "AccessControlUnauthorizedAccount");
    });

    it("non-admins can't grant roles to themselves or others", async () => {
      const { tr, R, producer, outsider } = await loadFixture(deploy);
      await expect(tr.connect(producer).grantRole(R.INSPECTOR, producer.address)).to.be.revertedWithCustomError(tr, "AccessControlUnauthorizedAccount");
      await expect(tr.connect(outsider).grantRole(R.PRODUCER, outsider.address)).to.be.revertedWithCustomError(tr, "AccessControlUnauthorizedAccount");
    });

    it("a recipient whose role was revoked after the offer can't accept", async () => {
      const { tr, R, producer, trader, create } = await loadFixture(deploy);
      const id = await create();
      await tr.connect(producer).proposeTransfer(id, trader.address, 0n);
      await tr.revokeRole(R.TRADER, trader.address);
      await expect(tr.connect(trader).acceptTransfer(id)).to.be.revertedWithCustomError(tr, "NotParticipant");
    });

    it("the administrator alone is not a participant and can't hold batches", async () => {
      const { tr, admin, producer, create } = await loadFixture(deploy);
      const id = await create();
      await expect(tr.connect(producer).proposeTransfer(id, admin.address, 0n)).to.be.revertedWithCustomError(tr, "RecipientNotParticipant");
    });

    it("a transporter can't sell, and a retailer can't log conditions", async () => {
      const { tr, producer, transporter, retailer, create, give } = await loadFixture(deploy);
      const a = await create();
      await give(a, producer, transporter);
      await expect(tr.connect(transporter).markSold(a, 0n)).to.be.revertedWithCustomError(tr, "AccessControlUnauthorizedAccount");
      const b = await create();
      await give(b, producer, retailer);
      await expect(tr.connect(retailer).recordCondition(b, 40, 500, "")).to.be.revertedWithCustomError(tr, "AccessControlUnauthorizedAccount");
    });
  });

  describe("boundary values", () => {
    it("split accepts 20 parts and rejects 21 and 1", async () => {
      const { tr, producer, create } = await loadFixture(deploy);
      const a = await create(20n);
      await tr.connect(producer).splitBatch(a, Array(20).fill(1n));
      expect((await tr.getBatch(a)).children.length).to.equal(20);
      const b = await create(21n);
      await expect(tr.connect(producer).splitBatch(b, Array(21).fill(1n))).to.be.revertedWithCustomError(tr, "InvalidPartCount");
      await expect(tr.connect(producer).splitBatch(b, [21n])).to.be.revertedWithCustomError(tr, "InvalidPartCount");
    });

    it("merge accepts 8 sources and rejects 9 and 1", async () => {
      const { tr, producer, create } = await loadFixture(deploy);
      const ids = [];
      for (let i = 0; i < 9; i++) ids.push(await create(10n));
      await expect(tr.connect(producer).mergeBatches(ids)).to.be.revertedWithCustomError(tr, "InvalidPartCount");
      await expect(tr.connect(producer).mergeBatches([ids[0]])).to.be.revertedWithCustomError(tr, "InvalidPartCount");
      await tr.connect(producer).mergeBatches(ids.slice(0, 8));
      const m = await tr.getBatch(10n);
      expect(m.quantity).to.equal(80n);
      expect(m.parents).to.deep.equal(ids.slice(0, 8));
    });

    it("quantities near uint128 max: split conserves, merge refuses to overflow", async () => {
      const { tr, producer, create } = await loadFixture(deploy);
      const a = await create(U128_MAX);
      await tr.connect(producer).splitBatch(a, [U128_MAX - 1n, 1n]);
      const b = await create(U128_MAX);
      // merge #2 (U128_MAX - 1) with #4 (U128_MAX): sum exceeds uint128
      await expect(tr.connect(producer).mergeBatches([2n, b])).to.be.revertedWithCustomError(tr, "InvalidQuantity");
      // the failed merge consumed nothing
      expect((await tr.getBatch(2n)).status).to.equal(Status.Active);
    });

    it("text limits are measured in bytes: 96 is fine, 97 is too long; required fields can't be empty", async () => {
      const { tr, producer, yesterday } = await loadFixture(deploy);
      const p = tr.connect(producer);
      await p.createBatch("a".repeat(96), 1n, "kg", "o", yesterday, "");
      await expect(p.createBatch("a".repeat(97), 1n, "kg", "o", yesterday, "")).to.be.revertedWithCustomError(tr, "TextTooLong");
      await expect(p.createBatch("é".repeat(49), 1n, "kg", "o", yesterday, "")).to.be.revertedWithCustomError(tr, "TextTooLong"); // 98 bytes
      await expect(p.createBatch("", 1n, "kg", "o", yesterday, "")).to.be.revertedWithCustomError(tr, "EmptyText");
      await expect(p.createBatch("x", 1n, "a".repeat(17), "o", yesterday, "")).to.be.revertedWithCustomError(tr, "TextTooLong");
    });

    it("dates: production can't be zero or in the future", async () => {
      const { tr, producer } = await loadFixture(deploy);
      const now = await time.latest();
      await expect(tr.connect(producer).createBatch("x", 1n, "kg", "o", 0, "")).to.be.revertedWithCustomError(tr, "InvalidDate");
      await expect(tr.connect(producer).createBatch("x", 1n, "kg", "o", now + 3600, "")).to.be.revertedWithCustomError(tr, "InvalidDate");
    });

    it("grades 1 and 5 are allowed, 0 and 6 are not; humidity tops out at 100.0%", async () => {
      const { tr, inspector, producer, transporter, create, give } = await loadFixture(deploy);
      const id = await create();
      await tr.connect(inspector).recordInspection(id, 1, "", "");
      await tr.connect(inspector).recordInspection(id, 5, "", "");
      await expect(tr.connect(inspector).recordInspection(id, 0, "", "")).to.be.revertedWithCustomError(tr, "InvalidGrade");
      await expect(tr.connect(inspector).recordInspection(id, 6, "", "")).to.be.revertedWithCustomError(tr, "InvalidGrade");
      await give(id, producer, transporter);
      await tr.connect(transporter).recordCondition(id, -200, 1000, "");
      await expect(tr.connect(transporter).recordCondition(id, 40, 1001, "")).to.be.revertedWithCustomError(tr, "InvalidQuantity");
    });
  });

  describe("lineage and recalls", () => {
    it("merge keeps every source as a parent, takes the earliest production date and conserves quantity", async () => {
      const { tr, producer, trader, give, yesterday } = await loadFixture(deploy);
      await tr.connect(producer).createBatch("Rice", 30n, "kg", "A", yesterday - 86400, "");
      await tr.connect(producer).createBatch("Rice", 45n, "kg", "B", yesterday, "");
      await give(1n, producer, trader);
      await give(2n, producer, trader);
      await expect(tr.connect(trader).mergeBatches([2n, 1n])).to.emit(tr, "BatchesMerged").withArgs(3n, [2n, 1n], 75n);
      const m = await tr.getBatch(3n);
      expect(m.quantity).to.equal(75n);
      expect(m.parents).to.deep.equal([2n, 1n]);
      expect(m.producedAt).to.equal(BigInt(yesterday - 86400));
      expect(m.producer).to.equal(trader.address);
      expect(m.origin).to.equal("Merged lot (see parent batches)");
      expect((await tr.getBatch(1n)).children).to.deep.equal([3n]);
      expect((await tr.getBatch(2n)).status).to.equal(Status.Consumed);
    });

    it("a batch with a recalled ancestor can't be merged, and its pending offer can't be accepted", async () => {
      const { tr, producer, retailer, create } = await loadFixture(deploy);
      const a = await create(100n);
      await tr.connect(producer).splitBatch(a, [50n, 50n]); // #2, #3
      const c = await create(10n); // #4
      await tr.connect(producer).proposeTransfer(3n, retailer.address, 0n);
      await tr.recallBatch(a, "contamination");
      await expect(tr.connect(producer).mergeBatches([2n, c])).to.be.revertedWithCustomError(tr, "BatchIsRecalled");
      await expect(tr.connect(retailer).acceptTransfer(3n)).to.be.revertedWithCustomError(tr, "BatchIsRecalled");
      expect((await tr.getBatch(3n)).custodian).to.equal(producer.address);
      // the stuck offer can still be cleared by either side
      await tr.connect(retailer).cancelTransfer(3n);
    });

    it("recall and clear work while the contract is paused (safety actions are never blocked)", async () => {
      const { tr, admin, inspector, create } = await loadFixture(deploy);
      const id = await create();
      await tr.connect(admin).pause();
      await expect(tr.connect(inspector).recallBatch(id, "urgent")).to.emit(tr, "BatchRecalled");
      await expect(tr.connect(admin).clearRecall(id, "false alarm")).to.emit(tr, "RecallCleared");
      await expect(create()).to.be.revertedWithCustomError(tr, "EnforcedPause");
      await tr.connect(admin).unpause();
      expect(await create()).to.equal(id + 1n);
    });

    it("a recall reaches grandchildren through split → merge → split", async () => {
      const { tr, producer, create } = await loadFixture(deploy);
      const a = await create(100n); // #1
      const b = await create(20n); // #2
      await tr.connect(producer).splitBatch(a, [60n, 40n]); // #3, #4
      await tr.connect(producer).mergeBatches([4n, b]); // #5 = 60
      await tr.connect(producer).splitBatch(5n, [30n, 30n]); // #6, #7
      await tr.recallBatch(b, "bad");
      expect(await tr.isRecalled(7n)).to.equal(true);
      expect(await tr.isRecalled(3n)).to.equal(false); // sibling line from #1 only
    });
  });
});
