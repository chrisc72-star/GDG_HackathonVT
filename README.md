FixTrail turns a photo of a housing problem into a dated record, a response clock, and a repair notice, and shows when many households in one building report the same problem. 

When a repair request goes nowhere, renters often have no proof they ever asked. Complaints are usually made by phone, in passing, or in texts that get lost, so a landlord can say they never heard about it. Students and first-time renters are especially exposed. Even when a tenant does keep records, each complaint stays isolated. If five households in a building have the same mold problem, nobody sees that it is one building-wide issue.

**Why AI, and where we deliberately didn’t use it**
The model does the one job that needs it: looking at a photo and returning structured JSON (category, priority, confidence, visible evidence). We kept AI out of everything that needs to be exactly right, such as deadlines, aggregation, and privacy rules.

**What FixTrail does:**
1. Photo to report. A tenant takes a photo, and the AI suggests a category (mold, leak, pests, electrical, and so on) and a priority. It also describes what it can see. The tenant can edit either one before saving.

2. A response clock. Each report gets a requested response date based on its priority. It shows as on track, due soon, or overdue.

3. A repair notice. One tap generates a PDF with the date, photo, description, and timeline, ready to send to the landlord.

4. Building patterns. Each building has an anonymous dashboard with open, overdue, and resolved counts and the median time to resolve. It flags patterns, such as several households with open mold reports. It shows nothing until at least 3 households have reported, and it never shows units, photos, or descriptions.

**How we built it:**
Next.js and TypeScript front end and API routes, Supabase (Postgres and private storage) for data, and Vercel for hosting. The classifier calls Gemma 4 through the Google Gemini API with a strict JSON output. The PDF notice is generated with pdf-lib.

**Responsible AI and privacy**
1. Human in the loop. The tenant confirms or edits every result before anything is saved.
2. Abstains when unsure. Low-confidence results ask the tenant to check them. Photos that aren’t housing problems are rejected.
3. Safety floors in code. A gas smell can never be rated below emergency, whatever the model says. Emergency issues show a “call 911” notice.
4. Validated output. Only schema-valid JSON is accepted. Text inside photos and notes is treated as data, never as instructions.
5. Privacy by design. Location data is stripped from photos in the browser before upload. Photos are stored privately. The server stores only a hash of the device token. Building pages use a minimum-households threshold. Tenants can delete one report or all their data.
6. No legal claims. Every notice says it isn’t legal advice, and the response times are labeled as tenant requests, not legal deadlines.
7. Accessibility. Labeled form controls, keyboard navigation, visible focus, status shown with icons and text rather than color alone, and large touch targets.

**Feasibility, cost, and sustainability:**
It runs on free tiers. Each report costs one small image call, and photos are downscaled before upload. It is open source under the Apache 2.0 license, with a setup guide, an env.example, and mapped dependencies, so a tenant union or campus legal aid office can deploy it themselves.
