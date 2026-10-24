# 2-minute demo script

**Before you start:** run in the mode you plan to claim. For the real demo, set the model key so the photo is actually analyzed. Open `/buildings/<Maple Ridge>` in one tab and `/report` on your phone or a second tab. Have one real photo of a believable problem ready (a stained ceiling, a leaky sink, a cracked wall). Do a full dry run at least two hours before the deadline.

## 0:00 to 0:20 — The problem

"When a repair request goes nowhere, the tenant has no proof they ever asked. And when five households have the same mold problem, nobody sees that it's one building-wide problem."

## 0:20 to 1:10 — Report flow (live)

1. Open **Report a problem**. Pick the building. Take or upload the photo.
2. Click **Analyze photo**. Point out: "It tells me what it *saw*, how confident it is, and I can change the category or priority."
3. Click **Confirm and save**.
4. Open **My reports**. "The clock started. This one is due in 14 days. These other states are on track, due soon, overdue. That's plain date math, not AI, on purpose."
5. Click **Download repair notice (PDF)**. Show the PDF: dated, photo, timeline, requested response date.

## 1:10 to 1:40 — Building patterns

Open the Maple Ridge dashboard. "Four households have open mold reports. No one sees units, photos, or descriptions, only counts, and only once at least three households have reported."
Open Pine Court: "Aggregate statistics stay hidden until enough households have reported; the community feed still shows reports that were submitted publicly."

## 1:40 to 2:00 — Responsible AI and close

- "Low confidence asks the tenant to confirm. A gas smell can never be rated below emergency. Non-housing photos are rejected."
- "Photos lose GPS data in the browser before upload. Only signed-in residents assigned to the hall can view its reports, and each tenant can delete their own report and photo."
- Tracks to name: say only the ones you actually fit. Do not claim the Gemma track when Claude is the classifier; Open-Source (public repo, MIT, README); Best UI/UX if you polished the flow.

## If something breaks live

- **Model API down:** the app falls back to a manual form. Say so, and continue.
- **Wi-Fi down:** demo mode works fully offline (keyword classifier). Say clearly that it is demo mode.
- **Never** present demo-mode behavior as photo analysis.
