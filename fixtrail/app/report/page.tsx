"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { SeverityBadge } from "@/components/Badges";
import { api, compressImage } from "@/lib/client";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  SEVERITIES,
  SEVERITY_LABELS,
  type Building,
  type Category,
  type Severity,
} from "@/lib/types";

interface Analysis {
  classification: { category: Category; severity: Severity; confidence: number; visibleEvidence: string };
  flags: string[];
  needsReview: boolean;
  emergencyNotice: string | null;
  provider: string;
  model: string;
}

type AnalyzeResponse = Analysis | { rejected: string; provider: string; model: string };

export default function ReportPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState("");
  const [landlordName, setLandlordName] = useState("");
  const [description, setDescription] = useState("");
  const [publicConsent, setPublicConsent] = useState(false);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [category, setCategory] = useState<Category>("other");
  const [severity, setSeverity] = useState<Severity>("standard");

  const [busy, setBusy] = useState<"idle" | "analyzing" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const resultRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    api<{ buildings: Building[] }>("/api/buildings")
      .then((d) => {
        setBuildings(d.buildings);
        const wanted = new URLSearchParams(window.location.search).get("building");
        if (wanted && d.buildings.some((b) => b.id === wanted)) setBuildingId(wanted);
        else if (d.buildings.length === 1) setBuildingId(d.buildings[0].id);
      })
      .catch(() => setError("Could not load the building list. Please refresh the page."));
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (analysis) resultRef.current?.focus();
  }, [analysis]);

  async function onPickFile(file: File | undefined) {
    setAnalysis(null);
    setMessage(null);
    setError(null);
    if (!file) {
      setPhoto(null);
      setPreviewUrl(null);
      return;
    }
    try {
      const blob = await compressImage(file);
      setPhoto(blob);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      setPhoto(null);
      setPreviewUrl(null);
      setError("That file could not be read as an image. Please try a different photo.");
    }
  }

  async function analyze(e: FormEvent) {
    e.preventDefault();
    if (!photo || !buildingId) return;
    setBusy("analyzing");
    setError(null);
    setMessage("Analyzing your photo…");
    try {
      const form = new FormData();
      form.set("photo", photo, "photo.jpg");
      form.set("description", description);
      const res = await api<AnalyzeResponse>("/api/classify", { method: "POST", body: form });
      if ("rejected" in res) {
        setAnalysis(null);
        setMessage(null);
        setError(res.rejected);
      } else {
        setAnalysis(res);
        setCategory(res.classification.category);
        setSeverity(res.classification.severity);
        setMessage("Analysis finished. Please review the suggestion below.");
      }
    } catch (err) {
      setMessage(null);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy("idle");
    }
  }

  async function save() {
    if (!photo || !analysis) return;
    setBusy("saving");
    setError(null);
    setMessage("Saving your report…");
    try {
      const form = new FormData();
      form.set("photo", photo, "photo.jpg");
      form.set("buildingId", buildingId);
      form.set("landlordName", landlordName.trim());
      form.set("description", description);
      form.set("publicConsent", String(publicConsent));
      form.set("category", category);
      form.set("severity", severity);
      form.set("aiCategory", analysis.classification.category);
      form.set("aiSeverity", analysis.classification.severity);
      form.set("aiConfidence", String(analysis.classification.confidence));
      form.set("visibleEvidence", analysis.classification.visibleEvidence);
      form.set("aiProvider", analysis.provider);
      form.set("aiModel", analysis.model);
      await api("/api/reports", { method: "POST", body: form });
      setDone(true);
      setMessage(null);
    } catch (err) {
      setMessage(null);
      setError(err instanceof Error ? err.message : "Could not save the report.");
    } finally {
      setBusy("idle");
    }
  }

  if (done) {
    return (
      <div className="card" role="status">
        <h1>Report saved</h1>
        <p>
          Your report is recorded with today&rsquo;s date and the response clock has started. You can
          generate a repair notice from your reports page.
        </p>
        <div className="actions">
          <Link className="btn" href="/reports">View my reports</Link>
          <button className="btn secondary" onClick={() => window.location.assign("/report")}>
            Report another problem
          </button>
        </div>
      </div>
    );
  }

  const isDemoClassifier = analysis?.provider === "mock";

  return (
    <>
      <h1>Report a problem</h1>
      <p className="lead">
        Take a clear, close-up photo of the problem. After you save, residents assigned to this building can see the photo and description on its dashboard.
        Unit labels and your identity will not be displayed.
      </p>

      <div aria-live="polite" role="status" className="meta" style={{ minHeight: "1.5rem" }}>
        {message}
      </div>
      {error && (
        <div className="notice bad" role="alert">
          {error}
        </div>
      )}

      <form className="card" onSubmit={analyze} aria-busy={busy !== "idle"}>
        <fieldset>
          <legend>1. Building details</legend>

          <div className="field">
            <label htmlFor="landlord-name">Landlord or manager</label>
            <input id="landlord-name" type="text" autoComplete="organization" maxLength={80} required value={landlordName} onChange={(e) => setLandlordName(e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="building">Building</label>
            <p className="hint">
              Reports can be filed only for the residence hall selected in your resident profile.
            </p>
            <select id="building" required value={buildingId} disabled={buildings.length === 1} onChange={(e) => setBuildingId(e.target.value)}>
              <option value="">Choose a building…</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

        </fieldset>

        <fieldset style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid var(--line)" }}>
          <legend>2. Photo and issue details</legend>
          <p className="hint">Your room number comes from your resident profile and is not displayed in the community feed.</p>

          <div className="field">
            <label htmlFor="photo">
              Photo of the problem
              <span className="hint">
                Location data is removed from your photo in your browser before it is uploaded.
              </span>
            </label>
            <input
              id="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              required
              onChange={(e) => onPickFile(e.target.files?.[0])}
            />
          </div>

          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="preview" src={previewUrl} alt="Preview of the photo you selected" />
          )}

          <div className="field">
            <label htmlFor="desc">
              Describe it in a sentence <span className="hint">Optional but helps. Up to 500 characters.</span>
            </label>
            <textarea id="desc" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <button className="btn" type="submit" disabled={!photo || !buildingId || busy !== "idle"}>
            {busy === "analyzing" ? "Analyzing…" : "Analyze photo"}
          </button>
        </fieldset>
      </form>

      {analysis && (
        <section className="card" aria-labelledby="review-title">
          <h2 id="review-title" ref={resultRef} tabIndex={-1}>3. Review and confirm</h2>
          <p>Check the suggested category and priority. You can change either before saving.</p>

          {analysis.emergencyNotice && (
            <div className="notice bad" role="alert">{analysis.emergencyNotice}</div>
          )}

          {isDemoClassifier && (
            <div className="notice warn">
              Demo classifier: this suggestion came from keywords in your description, not from the photo.
            </div>
          )}

          {analysis.needsReview && (
            <div className="notice warn">
              The analysis was not confident. Please check the category and priority yourself.
            </div>
          )}

          {analysis.flags.includes("severity_raised_by_rule") && (
            <div className="notice">
              Priority was raised automatically because this type of problem can affect safety.
            </div>
          )}

          <p>
            <strong>What the analysis saw:</strong> {analysis.classification.visibleEvidence || "No details given."}
          </p>
          <p className="meta">
            Confidence: {Math.round(analysis.classification.confidence * 100)}%. Model: {analysis.model}.
            You have the final say.
          </p>

          <div className="field">
            <label htmlFor="category">Category</label>
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="severity">Priority</label>
            <select id="severity" value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>
              ))}
            </select>
            <span className="hint">
              <SeverityBadge severity={severity} /> sets the response time you will request in your notice.
            </span>
          </div>

          <div className="notice warn" role="note">
            Other signed-in residents of this building can view your report, including its photo and description. Avoid including faces,
            names, mail, or other personal details in the photo or description. Your room number stays private.
          </div>

          <div className="field">
            <label>
              <input
                type="checkbox"
                required
                checked={publicConsent}
                onChange={(e) => setPublicConsent(e.target.checked)}
              />{" "}
              I understand other signed-in residents assigned to this building can view the submitted photo and description.
            </label>
          </div>

          <div className="actions">
            <button className="btn" onClick={save} disabled={busy !== "idle" || !publicConsent}>
              {busy === "saving" ? "Saving…" : "Confirm and save report"}
            </button>
          </div>
        </section>
      )}
    </>
  );
}
