import { DocsNav } from "@/components/DocsNav";

export default function SignupsGuidePage() {
  return (
    <main className="docs-main">
      <section className="card">
        <DocsNav />
      </section>
      <section className="card">
        <h1>Signups Guide</h1>
        <p className="muted">
          Public team intake workflow from self-service submission to race-control approval.
        </p>
        <h2>Flow Summary</h2>
        <ol>
          <li>Public users submit requests in `team-signup`.</li>
          <li>
            Submissions land in `team_signup_requests` as `pending` with `source=public_signup`.
          </li>
          <li>Admins review pending queue and manually promote approved teams to `teams`.</li>
          <li>Request status is updated to `approved`, `rejected`, or `spam`.</li>
        </ol>
        <h2>Protection Controls</h2>
        <ul>
          <li>Duplicate detection via `team_signup_has_recent_duplicate` RPC.</li>
          <li>RLS controls prevent broad anonymous data reads.</li>
          <li>Moderation is intentionally separated from direct team creation.</li>
        </ul>
        <p>
          Canonical details: <code>docs/signups_guide.md</code>.
        </p>
      </section>
    </main>
  );
}
