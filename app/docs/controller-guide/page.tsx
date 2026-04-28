import { DocsNav } from "@/components/DocsNav";

export default function ControllerGuidePage() {
  return (
    <main className="docs-main">
      <section className="card">
        <DocsNav />
      </section>
      <section className="card">
        <h1>Controller Guide</h1>
        <p className="muted">
          Race-control operational guide covering admin, marshal, and leaderboard workflows.
        </p>
        <ul>
          <li>Use `/admin` for race lifecycle, team setup, corrections, and incident notes.</li>
          <li>Use `/marshal` for relay point pass recording during race operations.</li>
          <li>Use `/leaderboard` for public-facing standings verification.</li>
        </ul>
        <h2>Critical Operating Rules</h2>
        <ul>
          <li>Run correction writes through the `admin-corrections` Edge Function only.</li>
          <li>Treat `admin_users` table as primary admin allowlist source.</li>
          <li>Treat `dev_users` table as primary developer docs allowlist source.</li>
          <li>Capture incidents with enough detail for post-race review.</li>
        </ul>
        <p>
          Canonical details: <code>docs/controller_guide.md</code>.
        </p>
      </section>
    </main>
  );
}
