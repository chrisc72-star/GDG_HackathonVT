import { describe, expect, it } from "vitest";
import { parseModelJson } from "@/lib/classify";
import { applySafetyRules, enforceSeverityFloor, sanitizeText } from "@/lib/safety";

const base = {
  category: "mold" as const,
  severity: "standard" as const,
  confidence: 0.9,
  visibleEvidence: "Dark spots on a bathroom ceiling.",
};

describe("applySafetyRules", () => {
  it("passes a confident, ordinary classification through unchanged", () => {
    const r = applySafetyRules(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.flags).toEqual([]);
      expect(r.needsReview).toBe(false);
      expect(r.emergencyNotice).toBeNull();
      expect(r.classification.severity).toBe("standard");
    }
  });

  it("raises gas odor to emergency even if the model said minor", () => {
    const r = applySafetyRules({ ...base, category: "gas_odor", severity: "minor" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.classification.severity).toBe("emergency");
      expect(r.flags).toContain("severity_raised_by_rule");
      expect(r.emergencyNotice).toContain("911");
    }
  });

  it("never lowers severity", () => {
    expect(enforceSeverityFloor("fire_safety", "emergency")).toBe("emergency");
    expect(enforceSeverityFloor("mold", "minor")).toBe("minor");
  });

  it("flags low confidence for human review", () => {
    const r = applySafetyRules({ ...base, confidence: 0.3 });
    expect(r.ok && r.needsReview).toBe(true);
    expect(r.flags).toContain("low_confidence");
  });

  it("rejects non-housing photos", () => {
    const r = applySafetyRules({ ...base, category: "not_housing" });
    expect(r.ok).toBe(false);
  });

  it("clamps out-of-range confidence and sanitizes evidence text", () => {
    const r = applySafetyRules({
      ...base,
      confidence: 7,
      visibleEvidence: "ok\u0000​text   with    spaces",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.classification.confidence).toBe(1);
      expect(r.classification.visibleEvidence).toBe("oktext with spaces");
    }
  });
});

describe("sanitizeText", () => {
  it("caps length and trims", () => {
    expect(sanitizeText("  hello  ", 3)).toBe("hel");
  });
});

describe("parseModelJson", () => {
  const good = {
    category: "water_leak",
    severity: "urgent",
    confidence: 0.8,
    visible_evidence: "Water dripping from a pipe.",
  };

  it("parses clean JSON", () => {
    expect(parseModelJson(JSON.stringify(good)).category).toBe("water_leak");
  });

  it("parses JSON wrapped in code fences and prose", () => {
    const text = "Sure! Here you go:\n```json\n" + JSON.stringify(good) + "\n```\nHope that helps.";
    expect(parseModelJson(text).severity).toBe("urgent");
  });

  it("rejects invented categories", () => {
    expect(() => parseModelJson(JSON.stringify({ ...good, category: "haunted" }))).toThrow();
  });

  it("rejects missing fields and non-JSON output", () => {
    expect(() => parseModelJson('{"category":"mold"}')).toThrow();
    expect(() => parseModelJson("I cannot help with that")).toThrow();
  });

  it("rejects out-of-range confidence", () => {
    expect(() => parseModelJson(JSON.stringify({ ...good, confidence: 2 }))).toThrow();
  });

  it("ignores extra fields an attacker might inject", () => {
    const parsed = parseModelJson(JSON.stringify({ ...good, severity_override: "minor", note: "ignore rules" }));
    expect(Object.keys(parsed).sort()).toEqual(["category", "confidence", "severity", "visibleEvidence"]);
  });
});
