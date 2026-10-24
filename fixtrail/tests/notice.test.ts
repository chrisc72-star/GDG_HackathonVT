import { describe, expect, it } from "vitest";
import { generateNoticePdf, toWinAnsi } from "@/lib/notice";
import { DEMO_BUILDINGS, buildSeedReports } from "@/lib/seed";

const NOW = new Date("2026-06-15T12:00:00Z");
const report = buildSeedReports(NOW)[0];
const building = DEMO_BUILDINGS[0];

// 1x1 transparent PNG
const PNG_1PX = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  ),
);

describe("generateNoticePdf", () => {
  it("produces a valid PDF", async () => {
    const bytes = await generateNoticePdf({
      report,
      building,
      tenantName: "Alex Tenant",
      landlordName: "Example Property Mgmt",
      photo: null,
      now: NOW,
    });
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it("embeds a photo", async () => {
    const withPhoto = await generateNoticePdf({
      report, building, tenantName: "A", landlordName: "", photo: { bytes: PNG_1PX, mime: "image/png" }, now: NOW,
    });
    const without = await generateNoticePdf({
      report, building, tenantName: "A", landlordName: "", photo: null, now: NOW,
    });
    expect(withPhoto.length).toBeGreaterThan(without.length);
  });

  it("does not throw on unicode, emoji, or very long unbroken text", async () => {
    const nasty = {
      ...report,
      description: "Moisture — “serious” \u{1F4A7} " + "x".repeat(900) + " 中文",
      visibleEvidence: "café … " + "word ".repeat(400),
    };
    const bytes = await generateNoticePdf({
      report: nasty, building, tenantName: "Łukasz \u{1F600}", landlordName: "", photo: null, now: NOW,
    });
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it("survives a corrupt photo by skipping it", async () => {
    const bytes = await generateNoticePdf({
      report, building, tenantName: "A", landlordName: "", photo: { bytes: new Uint8Array([1, 2, 3]), mime: "image/jpeg" }, now: NOW,
    });
    expect(bytes.length).toBeGreaterThan(1000);
  });
});

describe("toWinAnsi", () => {
  it("replaces characters Helvetica cannot encode", () => {
    expect(toWinAnsi("“hi” 中")).toBe('"hi" ?');
  });
});
