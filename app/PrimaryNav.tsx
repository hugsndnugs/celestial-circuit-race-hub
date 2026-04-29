"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = {
  label: string;
  href: string;
};

const primaryNavLinks: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Team Signup", href: "/signups" },
  { label: "Race Docs", href: "/docs" },
  { label: "Status", href: "/status" },
  { label: "Leaderboard", href: "/leaderboard" },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PrimaryNav() {
  const pathname = usePathname();

  return (
    <nav className="primary-nav" aria-label="Primary navigation">
      <ul>
        {primaryNavLinks.map((link) => {
          const isActive = isActivePath(pathname, link.href);
          return (
            <li key={link.href}>
              <Link href={link.href} aria-current={isActive ? "page" : undefined} className={isActive ? "active" : undefined}>
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
