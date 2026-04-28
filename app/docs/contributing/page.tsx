export default function ContributingPage() {
  return (
    <main>
      <section className="card">
        <h1>Contributing</h1>
        <p className="muted">
          Keep docs current with production behavior across all Celestial Circuit repositories.
        </p>
        <h2>When to Update Docs</h2>
        <ul>
          <li>Any environment variable, workflow, migration, or endpoint changes.</li>
          <li>Any operational workflow change for race control, signups, or status.</li>
          <li>Any new incident lessons that should be codified in the runbook.</li>
        </ul>
        <h2>Minimum Review Checklist</h2>
        <ul>
          <li>Confirm facts against source repos before merging docs changes.</li>
          <li>Run lint/build for this docs site.</li>
          <li>Verify all internal links resolve to valid routes and files.</li>
        </ul>
        <p>
          Canonical details: <code>docs/contributing.md</code>.
        </p>
      </section>
    </main>
  );
}
