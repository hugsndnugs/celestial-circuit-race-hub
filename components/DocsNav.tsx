import Link from "next/link";
import { docsSections } from "@/lib/docsSections";

export function DocsNav() {
  return (
    <nav aria-label="Primary documentation navigation" className="docs-nav">
      <ul>
        {docsSections.map((section) => (
          <li key={section.href}>
            <Link href={section.href}>{section.title}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
