export default function StatusGuidePage() {
  return (
    <main>
      <section className="card">
        <h1>Status Guide</h1>
        <p className="muted">
          Public status publishing guidance for race-day incidents and recovery updates.
        </p>
        <h2>Purpose</h2>
        <ul>
          <li>Provide a single public source of truth for participant-facing service health.</li>
          <li>Publish concise incident updates during disruptions or delayed operations.</li>
          <li>Close incidents with post-resolution messaging and links to follow-up actions.</li>
        </ul>
        <h2>Configuration</h2>
        <ul>
          <li>`NEXT_PUBLIC_STATUS_PAGE_TITLE` controls page heading copy.</li>
          <li>`NEXT_PUBLIC_STATUS_PUBLIC_URL` provides canonical external linking.</li>
        </ul>
        <p>
          Canonical details: <code>docs/status_guide.md</code>.
        </p>
      </section>
    </main>
  );
}
