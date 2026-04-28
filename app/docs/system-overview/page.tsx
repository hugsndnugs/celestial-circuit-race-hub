import { DocsNav } from "@/components/DocsNav";

export default function SystemOverviewPage() {
  return (
    <main className="docs-main">
      <section className="card">
        <DocsNav />
      </section>
      <section className="card">
        <h1>System Overview</h1>
        <p className="muted">
          Celestial Circuit runs as a multi-repository platform with a shared operational model.
        </p>
        <h2>Repository Map</h2>
        <ul>
          <li>
            <strong>celestial-circuit-race-controller</strong>: race administration, marshal pass
            logging, leaderboard, corrections, and incident notes.
          </li>
          <li>
            <strong>celestial-circuit-race-signups</strong>: public team intake app and Supabase
            migrations/functions for signup workflows.
          </li>
          <li>
            <strong>celestial-circuit-race-status</strong>: public status and incident publishing
            surface.
          </li>
          <li>
            <strong>celestial-circuit-race-docs</strong>: this centralized documentation hub.
          </li>
        </ul>
        <h2>Runtime Architecture</h2>
        <ul>
          <li>Frontend apps are Next.js static exports hosted via GitHub Pages.</li>
          <li>Operational state and race data are stored in Supabase Postgres.</li>
          <li>Browser clients use `NEXT_PUBLIC_SUPABASE_*` values with RLS protections.</li>
          <li>
            Privileged writes (for example correction apply/reject) are routed through Supabase
            Edge Functions.
          </li>
        </ul>
        <p>
          Canonical details: <code>docs/system_overview.md</code>.
        </p>
      </section>
    </main>
  );
}
