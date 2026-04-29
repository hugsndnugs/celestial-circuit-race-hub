import Link from "next/link";

type FooterLink = {
  href: string;
  label: string;
  icon: JSX.Element;
  external?: boolean;
};

const footerLinks: FooterLink[] = [
  {
    href: "https://discord.gg/mRzAB6ht2G",
    label: "Discord",
    external: true,
    icon: (
      <svg className="discord-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M19.73 5.47A17.4 17.4 0 0 0 15.4 4l-.2.41c1.5.36 2.17.88 2.17.88a7.35 7.35 0 0 0-4.67-1.43A7.34 7.34 0 0 0 8 5.3s.7-.54 2.28-.9L10.07 4a17.45 17.45 0 0 0-4.34 1.47C3 9.58 2.2 13.6 2.2 13.6a17.9 17.9 0 0 0 5.33 2.7l1.29-1.77c-1.11-.4-1.53-.8-1.53-.8.34.22.67.4.98.55a9.03 9.03 0 0 0 8.05 0c.32-.15.65-.34.99-.56 0 0-.45.43-1.62.83l1.29 1.77a17.82 17.82 0 0 0 5.34-2.71s-.82-4.02-3.59-8.14Zm-8.64 6.9c-.8 0-1.45-.72-1.45-1.62 0-.88.64-1.61 1.45-1.61.81 0 1.46.73 1.45 1.61 0 .9-.64 1.63-1.45 1.63Zm5.36 0c-.8 0-1.45-.72-1.45-1.62 0-.88.64-1.61 1.45-1.61.81 0 1.45.73 1.45 1.61 0 .9-.64 1.63-1.45 1.63Z"
        />
      </svg>
    ),
  },
  {
    href: "https://www.youtube.com/@osueverything",
    label: "YouTube",
    external: true,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M21.58 7.2a2.9 2.9 0 0 0-2.04-2.05C17.75 4.67 12 4.67 12 4.67s-5.75 0-7.54.48A2.9 2.9 0 0 0 2.42 7.2 30.34 30.34 0 0 0 2 12a30.34 30.34 0 0 0 .42 4.8 2.9 2.9 0 0 0 2.04 2.05c1.79.48 7.54.48 7.54.48s5.75 0 7.54-.48a2.9 2.9 0 0 0 2.04-2.05A30.34 30.34 0 0 0 22 12a30.34 30.34 0 0 0-.42-4.8ZM10.17 14.97V9.03L15.38 12l-5.2 2.97Z"
        />
      </svg>
    ),
  },
  {
    href: "mailto:support@celestialcircuithub.com",
    label: "Email",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M20 5H4a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 3.24-8 4.8-8-4.8V7l8 4.8 8-4.8v1.24Z"
        />
      </svg>
    ),
  },
];

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer" aria-label="Site footer">
      <div className="site-footer-shell">
        <p className="site-footer-copy">© {currentYear} Celestial Circuit</p>
        <ul className="site-footer-links" aria-label="Social links">
          {footerLinks.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className={`site-footer-icon-link${link.label === "Discord" ? " site-footer-icon-link-discord" : ""}`}
                aria-label={link.label}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
              >
                {link.icon}
                <span className="sr-only">{link.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
