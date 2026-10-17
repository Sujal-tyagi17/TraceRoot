import { describe, expect, it } from "vitest";
import { CONSERVATION, DEMO_NODES, ancestorsOf, depthOf, descendantsOf } from "@/lib/demoNetwork";
import { can, TABS } from "@/lib/permissions";
import { parseAddr, parseId, parseQty } from "@/lib/parse";
import { inr, toPaise } from "@/lib/format";
import { classify } from "@/lib/useTx";
import { roleId } from "@/lib/traceroot";

describe("example network", () => {
  it("conserves quantity at the split", () => {
    expect(CONSERVATION).toBe("100 kg = 40 kg + 60 kg");
    const lots = DEMO_NODES.filter((n) => n.kind === "child").map((n) => parseInt(n.sub));
    expect(lots.reduce((a, b) => a + b, 0)).toBe(100);
  });
  it("finds lineage both ways", () => {
    expect([...ancestorsOf("shopA")].sort()).toEqual(["lotB", "origin", "producer", "trader", "transporter"].sort());
    expect(descendantsOf("trader").has("shopB")).toBe(true);
    expect(descendantsOf("lotB").has("shopB")).toBe(false);
  });
  it("orders depth from the origin", () => {
    expect(depthOf("origin")).toBe(0);
    expect(depthOf("shopB")).toBe(5);
  });
  it("a recall at the origin reaches every node", () => {
    expect(descendantsOf("origin").size).toBe(DEMO_NODES.length - 1);
  });
});

describe("role-aware dashboard", () => {
  const visible = (roles: Parameters<typeof can>[0]) => TABS.filter((t) => t.visible(can(roles))).map((t) => t.label);
  it("shows each role only its tabs", () => {
    expect(visible([])).toEqual(["Overview"]);
    expect(visible(["ADMIN"])).toEqual(["Overview", "Recalls", "Admin"]);
    expect(visible(["PRODUCER"])).toEqual(["Overview", "Batches", "Transfers"]);
    expect(visible(["INSPECTOR"])).toContain("Inspections");
  });
  it("mirrors the contract's write permissions", () => {
    expect(can(["RETAILER"]).markSold).toBe(true);
    expect(can(["TRADER"]).createBatch).toBe(false);
    expect(can(["TRANSPORTER"]).splitMerge).toBe(false);
    expect(can(["INSPECTOR"]).recall && !can(["INSPECTOR"]).clearRecall).toBe(true);
  });
  it("role ids match the contract's keccak hashes", () => {
    expect(roleId("ADMIN")).toBe(`0x${"0".repeat(64)}`);
    // keccak256("PRODUCER_ROLE"), as computed by ethers (independent of the app's viem code)
    expect(roleId("PRODUCER")).toBe("0x8eb467f061ca67f42a2d2ca4a346fc9fb645efc0ba75056ee9f71c3a0ccc10a8");
  });
});

describe("form parsers", () => {
  it("accepts batch numbers with or without #", () => {
    expect(parseId("#7")).toBe(7n);
    expect(() => parseId("0")).toThrow(/positive whole number/);
    expect(() => parseId("abc")).toThrow();
  });
  it("normalises address casing", () => {
    expect(parseAddr("0x15d34AAf54267DB7D7c367839AAf71A00a2c6A65")).toBe("0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65");
    expect(() => parseAddr("0x123")).toThrow(/valid 0x/);
  });
  it("rejects zero and fractional quantities", () => {
    expect(parseQty("40")).toBe(40n);
    expect(() => parseQty("0")).toThrow();
    expect(() => parseQty("1.5")).toThrow();
  });
  it("converts rupees to paise and back", () => {
    expect(toPaise("16000.5")).toBe(1600050n);
    expect(inr(1600050n)).toContain("16,000.5");
  });
});

describe("transaction error classification", () => {
  it("separates wallet rejections, network problems and reverts", () => {
    expect(classify(new Error("User rejected the request."))).toBe("rejected");
    expect(classify(new Error("HTTP request failed. fetch failed"))).toBe("network");
    expect(classify(new Error("execution reverted"))).toBe("reverted");
  });
});
