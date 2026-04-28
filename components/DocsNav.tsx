"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { docsSections } from "@/lib/docsSections";

export function DocsNav() {
  const pathname = usePathname();
  const normalizePath = (value: string) => (value.endsWith("/") ? value.slice(0, -1) : value) || "/";
  const currentPath = normalizePath(pathname || "/");

  return (
    <nav aria-label="Primary documentation navigation" className="docs-nav">
      <ul>
        {docsSections.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className={normalizePath(section.href) === currentPath ? "active" : undefined}
              aria-current={normalizePath(section.href) === currentPath ? "page" : undefined}
            >
              {section.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
