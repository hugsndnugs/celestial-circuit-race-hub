import Link from "next/link";
import { docsSections } from "@/lib/docsSections";
import { DocsNav } from "@/components/DocsNav";

export default function DocsPage() {
  const docsTitle = process.env.NEXT_PUBLIC_DOCS_TITLE || "Celestial Circuit Docs";
  const docsVersion = process.env.NEXT_PUBLIC_DOCS_VERSION || "v1";
  return (
    <main>
      <section className="card">
        <h1>{docsTitle}</h1>
        <p className="muted">Version {docsVersion}. Canonical documentation hub for controller, signups, status, and deployment workflows.</p>
        <p>
          Start with <Link href="/docs/system-overview/">System Overview</Link>.
        </p>
      </section>
      <DocsNav />
      <section className="grid" aria-label="Documentation sections">
        {docsSections.map((section) => (
          <article key={section.title} className="card">
            <h2>{section.title}</h2>
            <p className="muted">{section.description}</p>
            <Link href={section.href}>Open section</Link>
          </article>
        ))}
      </section>
    </main>
  );
}
