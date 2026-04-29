import { DocsNav } from "@/components/DocsNav";

export default function EnvironmentPage() {
  return (
    <main className="docs-main">
      <section className="card">
        <DocsNav />
      </section>
      <section className="card">
        <h1>Environment</h1>
        <p className="muted">Consolidated environment matrix for all Celestial Circuit projects.</p>
        <h2>Shared Core Variables</h2>
        <ul>
          <li>`NEXT_PUBLIC_SUPABASE_URL`: required in controller and team-signup.</li>
          <li>`NEXT_PUBLIC_SUPABASE_ANON_KEY`: required in controller and team-signup.</li>
        </ul>
        <h2>Controller Variables</h2>
        <ul>
          <li>`NEXT_PUBLIC_ADMIN_EMAILS` (optional fallback allowlist).</li>
          <li>`NEXT_PUBLIC_DEV_EMAILS` (optional fallback developer allowlist).</li>
          <li>`NEXT_PUBLIC_MARSHAL_EMAILS` (optional fallback marshal allowlist).</li>
          <li>`NEXT_PUBLIC_DISCORD_PROXY_URL` (optional external notification bridge).</li>
        </ul>
        <h2>Adding Developers</h2>
        <ul>
          <li>Primary source: `dev_users` table in Supabase (`is_active = true`).</li>
          <li>Fallback source: `NEXT_PUBLIC_DEV_EMAILS` in `.env.local`.</li>
          <li>Team members sign in at `/signin` and then open the route for their role.</li>
        </ul>
        <h2>Adding Marshals</h2>
        <ul>
          <li>Primary source: `marshal_users` table in Supabase (`is_active = true`).</li>
          <li>Fallback source: `NEXT_PUBLIC_MARSHAL_EMAILS` in `.env.local`.</li>
          <li>Marshals must be signed in to use `/controller/marshal`.</li>
        </ul>
        <h2>Signups Variables</h2>
        <ul>
          <li>`NEXT_PUBLIC_BASE_PATH` and `NEXT_PUBLIC_ASSET_PREFIX` for project Pages hosting.</li>
          <li>`STATIC_EXPORT=true` for static build workflows.</li>
        </ul>
        <h2>Status Variables</h2>
        <ul>
          <li>`NEXT_PUBLIC_STATUS_PAGE_TITLE` for public title customization.</li>
          <li>`NEXT_PUBLIC_STATUS_PUBLIC_URL` for canonical status URL references.</li>
        </ul>
        <h2>Docs Variables</h2>
        <ul>
          <li>`NEXT_PUBLIC_DOCS_TITLE` to override docs heading.</li>
          <li>`NEXT_PUBLIC_DOCS_VERSION` to label docs release version.</li>
        </ul>
        <p>
          Canonical details: <code>docs/environment.md</code>.
        </p>
      </section>
    </main>
  );
}
