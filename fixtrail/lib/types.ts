export const CATEGORIES = [
  "mold",
  "water_leak",
  "plumbing",
  "heating_cooling",
  "electrical",
  "pests",
  "structural",
  "appliance",
  "lock_security",
  "fire_safety",
  "gas_odor",
  "sewage",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** The classifier may also say the photo is not a housing issue at all. */
export const CLASSIFIER_CATEGORIES = [...CATEGORIES, "not_housing"] as const;
export type ClassifierCategory = (typeof CLASSIFIER_CATEGORIES)[number];

export const SEVERITIES = ["minor", "standard", "urgent", "emergency"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_RANK: Record<Severity, number> = {
  minor: 0,
  standard: 1,
  urgent: 2,
  emergency: 3,
};

export const CATEGORY_LABELS: Record<Category, string> = {
  mold: "Mold or mildew",
  water_leak: "Water leak or damage",
  plumbing: "Plumbing (clog, fixture, hot water)",
  heating_cooling: "Heating or cooling",
  electrical: "Electrical",
  pests: "Pests",
  structural: "Structural (cracks, floors, stairs)",
  appliance: "Appliance",
  lock_security: "Locks or security",
  fire_safety: "Fire or smoke safety",
  gas_odor: "Gas smell or gas appliance",
  sewage: "Sewage or backup",
  other: "Other",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  minor: "Minor",
  standard: "Standard",
  urgent: "Urgent",
  emergency: "Emergency",
};

export type ReportStatus = "open" | "acknowledged" | "resolved";

export interface Building {
  id: string;
  name: string;
  addressLine: string;
  city: string;
  state: string;
  isDemo: boolean;
}

export type NewBuilding = Pick<Building, "name" | "addressLine" | "city" | "state">;

export interface Classification {
  category: ClassifierCategory;
  severity: Severity;
  /** 0 to 1 */
  confidence: number;
  /** One or two sentences describing only what is visible. */
  visibleEvidence: string;
}

export interface Report {
  id: string;
  buildingId: string;
  /** SHA-256 of the reporter's device token. Never sent to clients. */
  reporterHash: string;
  unitLabel: string;
  description: string;
  /** True only after the reporter explicitly agrees to public display. */
  isPublic: boolean;
  category: Category;
  severity: Severity;
  aiCategory: ClassifierCategory | null;
  aiSeverity: Severity | null;
  aiConfidence: number | null;
  visibleEvidence: string;
  flags: string[];
  tenantEdited: boolean;
  aiProvider: string | null;
  aiModel: string | null;
  status: ReportStatus;
  reportedAt: Date;
  dueAt: Date;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
  photoPath: string | null;
}

export type NewReport = Omit<Report, "photoPath"> & {
  photo?: { bytes: Uint8Array; mime: string };
};
