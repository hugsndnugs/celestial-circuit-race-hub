import { DocsNav } from "@/components/DocsNav";

export default function DeploymentsPage() {
  return (
    <main className="docs-main">
      <section className="card">
        <DocsNav />
      </section>
      <section className="card">
        <h1>Deployments</h1>
        <p className="muted">
          Deployment uses GitHub Actions + GitHub Pages for frontend sites and Supabase for backend
          functions and migrations.
        </p>
        <h2>Frontend Sites</h2>
        <ul>
          <li>Controller, docs, and status use `deploy-pages.yml` style static export workflows.</li>
          <li>Signups uses `deploy-team-signup-pages.yml` in the repository root.</li>
          <li>
            Build-time `NEXT_PUBLIC_*` variables must be available in Actions because values are
            bundled into exported assets.
          </li>
        </ul>
        <h2>Supabase Operations</h2>
        <ul>
          <li>Apply SQL migrations in order from each repository migration directory.</li>
          <li>
            Deploy Edge Functions (`admin-corrections`, `keep-alive`) and configure required
            secrets in Supabase.
          </li>
          <li>
            Keep keep-alive secrets synchronized between GitHub and Supabase to avoid auth failures.
          </li>
        </ul>
        <p>
          Canonical details: <code>docs/deployments.md</code>.
        </p>
      </section>
    </main>
  );
}
