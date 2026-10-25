/**
 * Team: Chris and Shruti
 * GDG Hackathon 2026
 * This module builds a downloadable repair-notice PDF from report and building details. It handles text encoding, wrapping, and document layout for the generated notice.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { JURISDICTION } from "./jurisdiction";
import { CATEGORY_LABELS, SEVERITY_LABELS, type Building, type Report } from "./types";

export interface NoticeInput {
  report: Report;
  building: Building;
  tenantName: string;
  landlordName: string;
  photo: { bytes: Uint8Array; mime: string } | null;
  now: Date;
}

/** Helvetica can only encode WinAnsi. Replace anything else so PDF creation never throws. */
export function toWinAnsi(s: string): string {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/\r?\n/g, " ")
    .replace(/[^\x20-\x7E -ÿ]/g, "?");
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = toWinAnsi(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
      // Hard-split a single very long token.
      while (font.widthOfTextAtSize(line, size) > maxWidth && line.length > 1) {
        let cut = line.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(line.slice(0, cut), size) > maxWidth) cut -= 1;
        lines.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

export async function generateNoticePdf(input: NoticeInput): Promise<Uint8Array> {
  const { report, building, tenantName, landlordName, photo, now } = input;
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 56;
  const WIDTH = PAGE_W - MARGIN * 2;

  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  const para = (text: string, opts: { size?: number; font?: PDFFont; gap?: number } = {}) => {
    const size = opts.size ?? 11;
    const f = opts.font ?? font;
    for (const line of wrap(text, f, size, WIDTH)) {
      ensureSpace(size + 4);
      page.drawText(line, { x: MARGIN, y, size, font: f, color: rgb(0.1, 0.1, 0.12) });
      y -= size + 4;
    }
    y -= opts.gap ?? 6;
  };

  para("NOTICE OF NEEDED REPAIR", { size: 18, font: bold, gap: 10 });
  para(`Date: ${fmtDate(now)}`);
  para(`To: ${landlordName.trim() || "Property owner / manager"}`, { gap: 2 });
  para(`From: ${tenantName.trim() || "Tenant"}`, { gap: 2 });
  para(
    `Premises: ${building.name}, ${building.addressLine}${building.city ? `, ${building.city}` : ""}, ${building.state}${report.unitLabel ? `, Unit ${report.unitLabel}` : ""}`,
    { gap: 12 },
  );

  para(
    `I am writing to give you written notice of a condition at the premises that needs repair: ${CATEGORY_LABELS[report.category]} (priority: ${SEVERITY_LABELS[report.severity]}).`,
  );
  if (report.description) para(`Tenant description: ${report.description}`);
  if (report.visibleEvidence) para(`Visible in the attached photo: ${report.visibleEvidence}`);
  para(
    `This condition was first documented with a photo on ${fmtDate(report.reportedAt)}. I request that it be addressed by ${fmtDate(report.dueAt)}. Please contact me to arrange access.`,
    { gap: 10 },
  );

  if (photo) {
    try {
      const img = photo.mime.includes("png")
        ? await pdf.embedPng(photo.bytes)
        : await pdf.embedJpg(photo.bytes);
      const maxW = WIDTH;
      const maxH = 260;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = img.width * scale;
      const h = img.height * scale;
      ensureSpace(h + 20);
      page.drawImage(img, { x: MARGIN, y: y - h, width: w, height: h });
      y -= h + 14;
    } catch {
      para("(Photo could not be embedded in this document.)");
    }
  }

  para("Timeline", { font: bold, gap: 3 });
  para(`Reported: ${fmtDate(report.reportedAt)}`, { gap: 2 });
  if (report.acknowledgedAt) para(`Acknowledged by landlord: ${fmtDate(report.acknowledgedAt)}`, { gap: 2 });
  if (report.resolvedAt) para(`Resolved: ${fmtDate(report.resolvedAt)}`, { gap: 2 });
  y -= 6;

  para(`Relevant law: ${JURISDICTION.letterCitation}`, { gap: 12 });

  para(
    "Generated by FixTrail from information supplied by the tenant. This is not legal advice. Check your lease and current law, and keep a copy of this notice and proof of how it was delivered.",
    { size: 9, gap: 0 },
  );

  return pdf.save();
}
