import { DocsNav } from "@/components/DocsNav";

export default function LocalDevelopmentPage() {
  return (
    <main className="docs-main">
      <section className="card">
        <DocsNav />
      </section>
      <section className="card">
        <h1>Local Development</h1>
        <p className="muted">
          Use this flow to bootstrap and validate each Celestial Circuit repository locally.
        </p>
        <h2>Prerequisites</h2>
        <ul>
          <li>Node.js 22 for docs, controller, and status CI parity.</li>
          <li>Node.js 20+ compatible environment for the signups deployment workflow.</li>
          <li>npm and Supabase project credentials for browser `NEXT_PUBLIC_*` values.</li>
        </ul>
        <h2>Recommended Bring-Up Order</h2>
        <ol>
          <li>Start `celestial-circuit-race-controller` and verify admin/marshal/leaderboard.</li>
          <li>
            Start `celestial-circuit-race-signups/team-signup` and submit a pending signup request.
          </li>
          <li>Start `celestial-circuit-race-status` for public status page checks.</li>
          <li>Run this docs site to verify runbook accuracy and cross-links.</li>
        </ol>
        <p>
          Canonical details: <code>docs/local_development.md</code>.
        </p>
      </section>
    </main>
  );
}
