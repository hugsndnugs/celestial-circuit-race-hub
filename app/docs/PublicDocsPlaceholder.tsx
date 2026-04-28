"use client";

import Link from "next/link";

export function PublicDocsPlaceholder() {
  return (
    <main className="docs-main">
      <section className="card">
        <h1>Race Rules and Public Terms</h1>
        <p className="muted">
          This page provides public-facing race guidance while internal engineering documents remain restricted.
        </p>
        <p>
          Developers can sign in at <Link href="/dev/signin">/dev/signin</Link> to access internal docs.
        </p>
      </section>

      <section className="card">
        <h2>Race Rules and Regulations</h2>
        <ul>
          <li>Teams must check in 30 minutes before the scheduled race start.</li>
          <li>Each relay point requires at least one verified marshal confirmation.</li>
          <li>Unsportsmanlike conduct may result in time penalties or disqualification.</li>
          <li>Race control decisions are final on safety and timing disputes.</li>
        </ul>
      </section>

      <section className="card">
        <h2>Terms of Service</h2>
        <p>
          Participation in Celestial Circuit events is voluntary. Teams accept responsibility for compliance with local
          event rules, platform usage requirements, and race communications standards.
        </p>
      </section>

      <section className="card">
        <h2>Legal Notice</h2>
        <p>
          Event details, schedules, and status updates are provided for operational awareness and may change without
          notice. Organizers reserve the right to modify race conditions for safety or fairness.
        </p>
      </section>
    </main>
  );
}
