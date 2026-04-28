export default function OperationsRunbookPage() {
  return (
    <main>
      <section className="card">
        <h1>Operations Runbook</h1>
        <p className="muted">Race-day operating standard from preflight through post-race closure.</p>
        <h2>Race Timeline</h2>
        <ol>
          <li>Preflight: confirm deployments, endpoints, and staff access.</li>
          <li>Start race from admin; verify status propagation to leaderboard and marshal views.</li>
          <li>During race: monitor pass intake, anomalies, and correction queue.</li>
          <li>Close race: mark complete, archive evidence, and publish summary notes.</li>
        </ol>
        <h2>Incident Handling</h2>
        <ul>
          <li>Classify severity quickly and publish participant-facing status updates.</li>
          <li>Record incident notes in admin with timeline context and owner.</li>
          <li>Use correction workflow for data fixes; avoid direct browser-side privileged writes.</li>
        </ul>
        <p>
          Canonical details: <code>docs/operations_runbook.md</code>.
        </p>
      </section>
    </main>
  );
}
