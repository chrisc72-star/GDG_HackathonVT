import Link from "next/link";
import { RuntimeBanner } from "@/components/RuntimeBanner";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
      <RuntimeBanner />

      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title">When the landlord says &ldquo;we never heard about it,&rdquo; you have a record.</h1>
        <p className="lead">
          FixTrail turns a photo of a housing problem into a dated, categorized report, starts a response
          clock, and shows patterns across a building so one tenant&rsquo;s complaint is no longer just one
          tenant&rsquo;s complaint.
        </p>
        <div className="actions">
          <Link href="/report" className="btn">Report a problem</Link>
          <Link href="/buildings" className="btn secondary">See building dashboards</Link>
        </div>
      </section>

      <section className="card" aria-labelledby="how-title">
        <h2 id="how-title">How it works</h2>
        <ol className="steps">
          <li>
            <strong>Snap a photo.</strong> The app suggests a category and priority and shows what it saw.
            You can change either one before saving.
          </li>
          <li>
            <strong>The clock starts.</strong> Plain date math (not AI) tracks how long the repair has been
            waiting, so you can see what is on track, due soon, or overdue.
          </li>
          <li>
            <strong>Generate a notice.</strong> One tap makes a dated PDF repair notice with your photo and
            timeline.
          </li>
          <li>
            <strong>See the pattern.</strong> Each building&rsquo;s dashboard shows combined counts, like
            several households reporting mold, without exposing any individual report.
          </li>
        </ol>
      </section>

      <section className="grid cols-3" aria-label="Design principles">
        <div className="card">
          <h3>Private by default</h3>
          <p>
            Photos and descriptions are visible only to the device that submitted them. Building pages show
            counts only, and only once enough households have reported.
          </p>
        </div>
        <div className="card">
          <h3>AI that admits doubt</h3>
          <p>
            Low-confidence results ask you to confirm. Safety issues like gas smells are never rated below
            a built-in floor, and non-housing photos are rejected.
          </p>
        </div>
        <div className="card">
          <h3>Yours to delete</h3>
          <p>You can delete one report or everything you have stored, photos included, in a click.</p>
        </div>
      </section>
    </>
  );
}
