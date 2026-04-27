type HubTarget = {
  title: string;
  description: string;
  href: string;
  cta: string;
  secondary?: boolean;
};

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

const pagesOrigin = trimTrailingSlash(
  process.env.NEXT_PUBLIC_PAGES_ORIGIN || "https://YOUR_GITHUB_USERNAME.github.io"
);

const targets: HubTarget[] = [
  {
    title: "Race Controller",
    description: "Admin, marshal logging, and real-time leaderboard operations.",
    href:
      process.env.NEXT_PUBLIC_CONTROLLER_URL ||
      `${pagesOrigin}/celestial-circuit-race-controller/`,
    cta: "Open race controller"
  },
  {
    title: "Team Signup",
    description: "Public team registration intake and submission flow.",
    href:
      process.env.NEXT_PUBLIC_SIGNUPS_URL ||
      `${pagesOrigin}/celestial-circuit-race-signups/`,
    cta: "Open team signup"
  },
  {
    title: "Documentation",
    description: "Race operations notes, setup, and future runbook entries.",
    href: process.env.NEXT_PUBLIC_DOCS_URL || "#",
    cta: "Open docs",
    secondary: true
  },
  {
    title: "Status",
    description: "Reserved slot for system status page and race-day alerts.",
    href: process.env.NEXT_PUBLIC_STATUS_URL || "#",
    cta: "Open status",
    secondary: true
  }
];

export default function HomePage() {
  return (
    <main>
      <section className="card hero">
        <h1>Race Operations Hub</h1>
        <p>
          Welcome to the central home for Celestial Circuit race-day tools. Choose where you want
          to go below for race control, team signup, documentation, or service status.
        </p>
      </section>

      <section className="grid" aria-label="Hub destinations">
        {targets.map((target) => (
          <article key={target.title} className="card">
            <h2>{target.title}</h2>
            <p className="muted">{target.description}</p>
            <a
              className={target.secondary ? "cc-link secondary" : "cc-link"}
              href={target.href}
              target={target.href.startsWith("#") ? undefined : "_blank"}
              rel={target.href.startsWith("#") ? undefined : "noreferrer"}
            >
              {target.cta}
            </a>
            {target.href.startsWith("#") ? (
              <p className="footer">This section is being prepared and will be available soon.</p>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}
