/**
 * Team: Chris and Shruti
 * GDG Hackathon 2026
 * This root layout defines site metadata and wraps every page with the shared header, navigation, main landmark, and footer. It also determines whether the administrator link is visible for the current user.
 */

import type { Metadata, Viewport } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { getCurrentUser, isAdminEmail, isVerifiedVtUser } from "@/lib/auth";
import { AuthControls } from "@/components/AuthControls";
import "./globals.css";

export const metadata: Metadata = {
  title: "FixTrail: document repairs, track deadlines, see patterns",
  description:
    "Photograph a housing problem, get it categorized, track how long your landlord takes to respond, and generate a repair notice.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: ReactNode }) {
  let showAdmin = false;
  try {
    const user = await getCurrentUser();
    showAdmin = isVerifiedVtUser(user) && isAdminEmail(user.email);
  } catch {
    // Auth is optional in demo mode; the protected admin page still enforces access.
  }
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <header className="site-header">
          <Link href="/" className="brand">
            Fix<span>Trail</span>
          </Link>
          <nav aria-label="Main">
            <ul>
              <li><Link href="/report">Report a problem</Link></li>
              <li><Link href="/reports">My reports</Link></li>
              <li><Link href="/buildings">My buildings</Link></li>
              {showAdmin && <li><Link href="/admin">Admin</Link></li>}
              <li><AuthControls /></li>
            </ul>
          </nav>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <p>
            FixTrail helps you keep records. It is not legal advice and not an emergency service. In an
            emergency, call 911. Check your lease and current law before relying on any notice.
          </p>
        </footer>
      </body>
    </html>
  );
}
