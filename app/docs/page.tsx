import Link from "next/link";
import { docsSections } from "@/lib/docsSections";
import { DocsNav } from "@/components/DocsNav";

export default function DocsPage() {
  const docsTitle = process.env.NEXT_PUBLIC_DOCS_TITLE || "Celestial Circuit Docs";
  const docsVersion = process.env.NEXT_PUBLIC_DOCS_VERSION || "v1";

  return (
    <main className="docs-main">
      <section className="card">
        <h1>{docsTitle}</h1>
        <p className="muted">
          Version {docsVersion}. This is the canonical documentation hub for controller operations,
          team signups intake, status publishing, and deployment workflows across all Celestial
          Circuit race repositories.
        </p>
        <p>
          Start with <Link href="/docs/system-overview/">System Overview</Link>, then follow{" "}
          <Link href="/docs/local-development/">Local Development</Link> and{" "}
          <Link href="/docs/operations-runbook/">Operations Runbook</Link> for daily operations.
        </p>
      </section>

      <section className="card">
        <DocsNav />
      </section>

      <section className="grid" aria-label="Documentation sections">
        {docsSections.map((section) => (
          <article key={section.title} className="card">
            <h2>{section.title}</h2>
            <p className="muted">{section.description}</p>
            <Link href={section.href} className="button-link">
              Open section
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
