const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const Status = { None: 0n, Active: 1n, Consumed: 2n, Sold: 3n };
const DAY = 24 * 60 * 60;

async function deploy() {
  const [admin, farmer, trader, transporter, inspector, retailer, outsider, farmer2] = await ethers.getSigners();
  const TraceRoot = await ethers.getContractFactory("TraceRoot");
  const tr = await TraceRoot.deploy(admin.address);

  const R = {
    PRODUCER: await tr.PRODUCER_ROLE(),
    TRADER: await tr.TRADER_ROLE(),
    TRANSPORTER: await tr.TRANSPORTER_ROLE(),
    INSPECTOR: await tr.INSPECTOR_ROLE(),
    RETAILER: await tr.RETAILER_ROLE(),
    ADMIN: await tr.DEFAULT_ADMIN_ROLE(),
  };
  await tr.grantRole(R.PRODUCER, farmer.address);
  await tr.grantRole(R.PRODUCER, farmer2.address);
  await tr.grantRole(R.TRADER, trader.address);
  await tr.grantRole(R.TRANSPORTER, transporter.address);
  await tr.grantRole(R.INSPECTOR, inspector.address);
  await tr.grantRole(R.RETAILER, retailer.address);

  const now = await time.latest();
  const create = async (signer = farmer, qty = 100n, product = "Basmati rice", unit = "kg") => {
    const tx = await tr.connect(signer).createBatch(product, qty, unit, "Karnal, Haryana", now - DAY, "");
    const rc = await tx.wait();
    const ev = rc.logs.map((l) => tr.interface.parseLog(l)).find((e) => e && e.name === "BatchCreated");
    return ev.args.batchId;
  };
  const handoff = async (id, from, to, price = 0n) => {
    await tr.connect(from).proposeTransfer(id, to.address, price);
    await tr.connect(to).acceptTransfer(id);
  };
  return { tr, R, admin, farmer, trader, transporter, inspector, retailer, outsider, farmer2, create, handoff, now };
}

describe("TraceRoot", () => {
  describe("roles", () => {
    it("only producers can create batches", async () => {
      const { tr, outsider, trader, now } = await loadFixture(deploy);
      await expect(tr.connect(outsider).createBatch("x", 1, "kg", "y", now - DAY, ""))
        .to.be.revertedWithCustomError(tr, "AccessControlUnauthorizedAccount");
      await expect(tr.connect(trader).createBatch("x", 1, "kg", "y", now - DAY, ""))
        .to.be.revertedWithCustomError(tr, "AccessControlUnauthorizedAccount");
    });

    it("only admin can grant roles", async () => {
      const { tr, R, farmer, outsider } = await loadFixture(deploy);
      await expect(tr.connect(farmer).grantRole(R.TRADER, outsider.address))
        .to.be.revertedWithCustomError(tr, "AccessControlUnauthorizedAccount");
    });

    it("a revoked participant can no longer act on batches they hold", async () => {
      const { tr, R, farmer, trader, create } = await loadFixture(deploy);
      const id = await create();
      await tr.revokeRole(R.PRODUCER, farmer.address);
      await expect(tr.connect(farmer).proposeTransfer(id, trader.address, 0))
        .to.be.revertedWithCustomError(tr, "NotParticipant");
    });

    it("pause blocks writes", async () => {
      const { tr, farmer, now } = await loadFixture(deploy);
      await tr.pause();
      await expect(tr.connect(farmer).createBatch("x", 1, "kg", "y", now - DAY, ""))
        .to.be.revertedWithCustomError(tr, "EnforcedPause");
    });
  });

  describe("batch creation", () => {
    it("stores fields and emits BatchCreated", async () => {
      const { tr, farmer, create } = await loadFixture(deploy);
      const id = await create();
      const b = await tr.getBatch(id);
      expect(b.quantity).to.equal(100n);
      expect(b.custodian).to.equal(farmer.address);
      expect(b.producer).to.equal(farmer.address);
      expect(b.status).to.equal(Status.Active);
      expect(await tr.batchCount()).to.equal(1n);
    });

    it("rejects invalid input", async () => {
      const { tr, farmer, now } = await loadFixture(deploy);
      const c = tr.connect(farmer);
      await expect(c.createBatch("x", 0, "kg", "y", now - DAY, "")).to.be.revertedWithCustomError(tr, "InvalidQuantity");
      await expect(c.createBatch("", 1, "kg", "y", now - DAY, "")).to.be.revertedWithCustomError(tr, "EmptyText");
      await expect(c.createBatch("x", 1, "kg", "y", 0, "")).to.be.revertedWithCustomError(tr, "InvalidDate");
      await expect(c.createBatch("x", 1, "kg", "y", now + 10 * DAY, "")).to.be.revertedWithCustomError(tr, "InvalidDate");
      await expect(c.createBatch("x".repeat(97), 1, "kg", "y", now - DAY, "")).to.be.revertedWithCustomError(tr, "TextTooLong");
    });

    it("unknown ids revert", async () => {
      const { tr } = await loadFixture(deploy);
      await expect(tr.getBatch(42)).to.be.revertedWithCustomError(tr, "BatchNotFound");
    });
  });

  describe("two-step handoffs", () => {
    it("custody changes only after the recipient accepts", async () => {
      const { tr, farmer, trader, create } = await loadFixture(deploy);
      const id = await create();
      await expect(tr.connect(farmer).proposeTransfer(id, trader.address, 250000))
        .to.emit(tr, "TransferProposed");
      expect((await tr.getBatch(id)).custodian).to.equal(farmer.address);
      await expect(tr.connect(trader).acceptTransfer(id))
        .to.emit(tr, "TransferAccepted").withArgs(id, farmer.address, trader.address, 250000);
      expect((await tr.getBatch(id)).custodian).to.equal(trader.address);
      expect((await tr.pendingTransfer(id)).to).to.equal(ethers.ZeroAddress);
    });

    it("only the named recipient can accept", async () => {
      const { tr, farmer, trader, retailer, create } = await loadFixture(deploy);
      const id = await create();
      await tr.connect(farmer).proposeTransfer(id, trader.address, 0);
      await expect(tr.connect(retailer).acceptTransfer(id)).to.be.revertedWithCustomError(tr, "NotRecipient");
      await expect(tr.connect(farmer).acceptTransfer(id)).to.be.revertedWithCustomError(tr, "NotRecipient");
    });

    it("non-custodian cannot propose; recipient must be a participant", async () => {
      const { tr, farmer, trader, outsider, create } = await loadFixture(deploy);
      const id = await create();
      await expect(tr.connect(trader).proposeTransfer(id, trader.address, 0)).to.be.revertedWithCustomError(tr, "NotCustodian");
      await expect(tr.connect(farmer).proposeTransfer(id, outsider.address, 0)).to.be.revertedWithCustomError(tr, "RecipientNotParticipant");
      await expect(tr.connect(farmer).proposeTransfer(id, farmer.address, 0)).to.be.revertedWithCustomError(tr, "InvalidRecipient");
      await expect(tr.connect(farmer).proposeTransfer(id, ethers.ZeroAddress, 0)).to.be.revertedWithCustomError(tr, "InvalidRecipient");
    });

    it("blocks a second pending transfer", async () => {
      const { tr, farmer, trader, retailer, create } = await loadFixture(deploy);
      const id = await create();
      await tr.connect(farmer).proposeTransfer(id, trader.address, 0);
      await expect(tr.connect(farmer).proposeTransfer(id, retailer.address, 0)).to.be.revertedWithCustomError(tr, "TransferPending");
    });

    it("sender can cancel, recipient can reject, outsiders cannot", async () => {
      const { tr, farmer, trader, retailer, create } = await loadFixture(deploy);
      const id = await create();
      await tr.connect(farmer).proposeTransfer(id, trader.address, 0);
      await expect(tr.connect(retailer).cancelTransfer(id)).to.be.revertedWithCustomError(tr, "NotCustodian");
      await expect(tr.connect(trader).cancelTransfer(id)).to.emit(tr, "TransferCancelled");
      await expect(tr.connect(trader).acceptTransfer(id)).to.be.revertedWithCustomError(tr, "NoPendingTransfer");
      await tr.connect(farmer).proposeTransfer(id, trader.address, 0);
      await tr.connect(farmer).cancelTransfer(id);
      await expect(tr.connect(farmer).cancelTransfer(id)).to.be.revertedWithCustomError(tr, "NoPendingTransfer");
    });

    it("expired offers cannot be accepted", async () => {
      const { tr, farmer, trader, create } = await loadFixture(deploy);
      const id = await create();
      await tr.connect(farmer).proposeTransfer(id, trader.address, 0);
      await time.increase(7 * DAY + 1);
      await expect(tr.connect(trader).acceptTransfer(id)).to.be.revertedWithCustomError(tr, "TransferExpired");
      await tr.connect(farmer).cancelTransfer(id);
    });

    it("full journey farmer → transporter → trader → retailer → sold", async () => {
      const { tr, farmer, transporter, trader, retailer, handoff, create } = await loadFixture(deploy);
      const id = await create();
      await handoff(id, farmer, transporter);
      await tr.connect(transporter).recordCondition(id, 45, 620, "Reefer truck");
      await handoff(id, transporter, trader, 300000);
      await handoff(id, trader, retailer, 420000);
      await expect(tr.connect(retailer).markSold(id, 600000)).to.emit(tr, "BatchSold").withArgs(id, retailer.address, 600000);
      expect((await tr.getBatch(id)).status).to.equal(Status.Sold);
      await expect(tr.connect(retailer).proposeTransfer(id, trader.address, 0)).to.be.revertedWithCustomError(tr, "NotActive");
      await expect(tr.connect(retailer).markSold(id, 1)).to.be.revertedWithCustomError(tr, "NotActive");
    });
  });

  describe("splitting (quantity conservation)", () => {
    it("exact allocation creates children and consumes parent", async () => {
      const { tr, farmer, trader, create, handoff } = await loadFixture(deploy);
      const id = await create();
      await handoff(id, farmer, trader);
      await expect(tr.connect(trader).splitBatch(id, [40, 60])).to.emit(tr, "BatchSplit");
      expect((await tr.getBatch(id)).status).to.equal(Status.Consumed);
      const kids = await tr.getChildren(id);
      expect(kids.length).to.equal(2);
      const a = await tr.getBatch(kids[0]);
      const b = await tr.getBatch(kids[1]);
      expect(a.quantity + b.quantity).to.equal(100n);
      expect(a.custodian).to.equal(trader.address);
      expect(a.producer).to.equal(farmer.address);
      expect(a.origin).to.equal("Karnal, Haryana");
      expect(await tr.getParents(kids[0])).to.deep.equal([id]);
    });

    it("rejects under-, over- and zero allocation", async () => {
      const { tr, farmer, create } = await loadFixture(deploy);
      const id = await create();
      await expect(tr.connect(farmer).splitBatch(id, [40, 50])).to.be.revertedWithCustomError(tr, "QuantityMismatch");
      await expect(tr.connect(farmer).splitBatch(id, [40, 61])).to.be.revertedWithCustomError(tr, "QuantityMismatch");
      await expect(tr.connect(farmer).splitBatch(id, [0, 100])).to.be.revertedWithCustomError(tr, "InvalidQuantity");
      await expect(tr.connect(farmer).splitBatch(id, [100])).to.be.revertedWithCustomError(tr, "InvalidPartCount");
      await expect(tr.connect(farmer).splitBatch(id, Array(21).fill(1))).to.be.revertedWithCustomError(tr, "InvalidPartCount");
    });

    it("a consumed parent cannot be split, moved or merged again", async () => {
      const { tr, farmer, trader, create } = await loadFixture(deploy);
      const id = await create();
      const other = await create();
      await tr.connect(farmer).splitBatch(id, [50, 50]);
      await expect(tr.connect(farmer).splitBatch(id, [50, 50])).to.be.revertedWithCustomError(tr, "NotActive");
      await expect(tr.connect(farmer).proposeTransfer(id, trader.address, 0)).to.be.revertedWithCustomError(tr, "NotActive");
      await expect(tr.connect(farmer).mergeBatches([id, other])).to.be.revertedWithCustomError(tr, "NotActive");
    });

    it("cannot split while a transfer is pending, or as transporter/non-custodian", async () => {
      const { tr, farmer, trader, transporter, create, handoff } = await loadFixture(deploy);
      const id = await create();
      await tr.connect(farmer).proposeTransfer(id, trader.address, 0);
      await expect(tr.connect(farmer).splitBatch(id, [50, 50])).to.be.revertedWithCustomError(tr, "TransferPending");
      await expect(tr.connect(trader).splitBatch(id, [50, 50])).to.be.revertedWithCustomError(tr, "NotCustodian");
      await tr.connect(trader).acceptTransfer(id);
      await handoff(id, trader, transporter);
      await expect(tr.connect(transporter).splitBatch(id, [50, 50])).to.be.revertedWithCustomError(tr, "NotParticipant");
    });
  });

  describe("merging", () => {
    it("merges compatible batches and conserves quantity", async () => {
      const { tr, farmer, farmer2, trader, create, handoff } = await loadFixture(deploy);
      const a = await create(farmer, 30n);
      const b = await create(farmer2, 70n);
      await handoff(a, farmer, trader);
      await handoff(b, farmer2, trader);
      await expect(tr.connect(trader).mergeBatches([a, b])).to.emit(tr, "BatchesMerged");
      const id = await tr.batchCount();
      const m = await tr.getBatch(id);
      expect(m.quantity).to.equal(100n);
      expect(await tr.getParents(id)).to.deep.equal([a, b]);
      expect((await tr.getBatch(a)).status).to.equal(Status.Consumed);
      expect((await tr.getBatch(b)).status).to.equal(Status.Consumed);
    });

    it("rejects duplicates, incompatible products/units, foreign batches", async () => {
      const { tr, farmer, farmer2, create } = await loadFixture(deploy);
      const a = await create(farmer, 10n);
      const b = await create(farmer, 10n, "Wheat");
      const c = await create(farmer, 10n, "Basmati rice", "quintal");
      const d = await create(farmer2, 10n);
      await expect(tr.connect(farmer).mergeBatches([a, a])).to.be.revertedWithCustomError(tr, "NotActive");
      await expect(tr.connect(farmer).mergeBatches([a, b])).to.be.revertedWithCustomError(tr, "IncompatibleBatches");
      await expect(tr.connect(farmer).mergeBatches([a, c])).to.be.revertedWithCustomError(tr, "IncompatibleBatches");
      await expect(tr.connect(farmer).mergeBatches([a, d])).to.be.revertedWithCustomError(tr, "NotCustodian");
      await expect(tr.connect(farmer).mergeBatches([a])).to.be.revertedWithCustomError(tr, "InvalidPartCount");
      // state is untouched after a failed merge
      expect((await tr.getBatch(a)).status).to.equal(Status.Active);
    });

    it("bounds lineage size so recall checks stay cheap", async () => {
      const { tr, farmer, create } = await loadFixture(deploy);
      let id = await create(farmer, 1000n);
      let reverted = false;
      for (let i = 0; i < 70 && !reverted; i++) {
        const b = await tr.getBatch(id);
        try {
          await tr.connect(farmer).splitBatch(id, [b.quantity - 1n, 1n]);
          id = (await tr.getChildren(id))[0];
        } catch (e) {
          expect(e.message).to.include("LineageTooLarge");
          reverted = true;
        }
      }
      expect(reverted).to.equal(true);
    });
  });

  describe("inspections, conditions, evidence", () => {
    it("only inspectors can inspect; grade must be 1..5", async () => {
      const { tr, inspector, farmer, create } = await loadFixture(deploy);
      const id = await create();
      await expect(tr.connect(farmer).recordInspection(id, 4, "", "")).to.be.revertedWithCustomError(tr, "AccessControlUnauthorizedAccount");
      await expect(tr.connect(inspector).recordInspection(id, 0, "", "")).to.be.revertedWithCustomError(tr, "InvalidGrade");
      await expect(tr.connect(inspector).recordInspection(id, 6, "", "")).to.be.revertedWithCustomError(tr, "InvalidGrade");
      await expect(tr.connect(inspector).recordInspection(id, 5, "bafy...", "Moisture 12%"))
        .to.emit(tr, "InspectionRecorded").withArgs(id, inspector.address, 5, "bafy...", "Moisture 12%");
      await expect(tr.connect(inspector).recordInspection(99, 5, "", "")).to.be.revertedWithCustomError(tr, "BatchNotFound");
    });

    it("conditions only by the transporter in custody", async () => {
      const { tr, farmer, transporter, create, handoff } = await loadFixture(deploy);
      const id = await create();
      await expect(tr.connect(transporter).recordCondition(id, 40, 500, "")).to.be.revertedWithCustomError(tr, "NotCustodian");
      await expect(tr.connect(farmer).recordCondition(id, 40, 500, "")).to.be.revertedWithCustomError(tr, "AccessControlUnauthorizedAccount");
      await handoff(id, farmer, transporter);
      await expect(tr.connect(transporter).recordCondition(id, 40, 1001, "")).to.be.revertedWithCustomError(tr, "InvalidQuantity");
      await expect(tr.connect(transporter).recordCondition(id, -15, 300, "frozen")).to.emit(tr, "ConditionRecorded");
    });

    it("evidence only by custodian", async () => {
      const { tr, farmer, trader, create } = await loadFixture(deploy);
      const id = await create();
      await expect(tr.connect(trader).addEvidence(id, "photo", "bafy")).to.be.revertedWithCustomError(tr, "NotCustodian");
      await expect(tr.connect(farmer).addEvidence(id, "photo", "bafy")).to.emit(tr, "EvidenceAdded");
    });

    it("only retailers can mark sold", async () => {
      const { tr, farmer, create } = await loadFixture(deploy);
      const id = await create();
      await expect(tr.connect(farmer).markSold(id, 1)).to.be.revertedWithCustomError(tr, "AccessControlUnauthorizedAccount");
    });
  });

  describe("recalls", () => {
    it("admin or inspector can recall; others cannot; only admin clears", async () => {
      const { tr, inspector, farmer, create } = await loadFixture(deploy);
      const id = await create();
      await expect(tr.connect(farmer).recallBatch(id, "x")).to.be.revertedWithCustomError(tr, "NotParticipant");
      await expect(tr.connect(inspector).recallBatch(id, "Pesticide residue")).to.emit(tr, "BatchRecalled");
      await expect(tr.connect(inspector).recallBatch(id, "again")).to.be.revertedWithCustomError(tr, "AlreadyRecalled");
      await expect(tr.connect(inspector).clearRecall(id, "ok")).to.be.revertedWithCustomError(tr, "AccessControlUnauthorizedAccount");
      await expect(tr.clearRecall(id, "Lab retest passed")).to.emit(tr, "RecallCleared");
      expect(await tr.isRecalled(id)).to.equal(false);
      await expect(tr.clearRecall(id, "x")).to.be.revertedWithCustomError(tr, "NotRecalled");
    });

    it("recalled batches cannot move, split, merge or be sold; pending offer is cancelled", async () => {
      const { tr, farmer, trader, create } = await loadFixture(deploy);
      const id = await create();
      const other = await create();
      await tr.connect(farmer).proposeTransfer(id, trader.address, 0);
      await expect(tr.recallBatch(id, "Contamination")).to.emit(tr, "TransferCancelled");
      await expect(tr.connect(trader).acceptTransfer(id)).to.be.revertedWithCustomError(tr, "NoPendingTransfer");
      await expect(tr.connect(farmer).proposeTransfer(id, trader.address, 0)).to.be.revertedWithCustomError(tr, "BatchIsRecalled");
      await expect(tr.connect(farmer).splitBatch(id, [50, 50])).to.be.revertedWithCustomError(tr, "BatchIsRecalled");
      await expect(tr.connect(farmer).mergeBatches([other, id])).to.be.revertedWithCustomError(tr, "BatchIsRecalled");
    });

    it("recalling an ancestor propagates to children created earlier (split + merge)", async () => {
      const { tr, farmer, farmer2, trader, create, handoff } = await loadFixture(deploy);
      const root = await create(farmer, 100n);
      await tr.connect(farmer).splitBatch(root, [40, 60]);
      const [c1, c2] = await tr.getChildren(root);
      const other = await create(farmer2, 20n);
      await handoff(c1, farmer, trader);
      await handoff(other, farmer2, trader);
      await tr.connect(trader).mergeBatches([c1, other]);
      const merged = await tr.batchCount();

      expect(await tr.isRecalled(merged)).to.equal(false);
      await tr.recallBatch(root, "Aflatoxin found at farm");
      expect(await tr.isRecalled(c1)).to.equal(true);
      expect(await tr.isRecalled(c2)).to.equal(true);
      expect(await tr.isRecalled(merged)).to.equal(true);
      expect(await tr.isRecalled(other)).to.equal(false);
      await expect(tr.connect(farmer).proposeTransfer(c2, trader.address, 0)).to.be.revertedWithCustomError(tr, "BatchIsRecalled");

      await tr.clearRecall(root, "False positive");
      expect(await tr.isRecalled(merged)).to.equal(false);
    });
  });

  describe("invariant: quantity is never created", () => {
    it("random split/merge sequences keep total active quantity constant", async () => {
      const { tr, farmer, create } = await loadFixture(deploy);
      const initial = [100n, 250n, 37n];
      for (const q of initial) await create(farmer, q);
      const total = initial.reduce((a, b) => a + b, 0n);
      let seed = 1337;
      const rand = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };

      for (let step = 0; step < 40; step++) {
        const count = Number(await tr.batchCount());
        const active = [];
        for (let i = 1; i <= count; i++) {
          const b = await tr.getBatch(i);
          if (b.status === Status.Active) active.push({ id: BigInt(i), q: b.quantity });
        }
        const sum = active.reduce((a, b) => a + b.q, 0n);
        expect(sum).to.equal(total);

        if (rand(2) === 0 || active.length < 2) {
          const pick = active.find((x) => x.q >= 2n);
          if (!pick) continue;
          const left = BigInt(1 + rand(Number(pick.q - 1n)));
          await tr.connect(farmer).splitBatch(pick.id, [left, pick.q - left]);
        } else {
          const ids = active.slice(0, 2 + rand(Math.min(3, active.length - 1))).map((x) => x.id);
          try { await tr.connect(farmer).mergeBatches(ids); } catch (e) {
            expect(e.message).to.match(/LineageTooLarge/);
          }
        }
      }
    });
  });
});

describe("TraceRoot event block index", () => {
  it("records one block per batch event block, enabling exact log queries", async () => {
    const { tr, farmer, trader, create, handoff } = await loadFixture(deploy);
    const id = await create();
    await handoff(id, farmer, trader);
    await tr.connect(trader).splitBatch(id, [10, 90]);
    const blocks = await tr.getEventBlocks(id);
    expect(blocks.length).to.equal(4); // created, proposed, accepted, split
    const logs = [];
    for (const b of blocks) {
      logs.push(...(await tr.queryFilter("*", Number(b), Number(b))));
    }
    const names = logs.map((l) => l.fragment && l.fragment.name);
    expect(names).to.include.members(["BatchCreated", "TransferProposed", "TransferAccepted", "BatchSplit"]);
    const [child] = await tr.getChildren(id);
    expect((await tr.getEventBlocks(child)).length).to.equal(1);
  });
});
