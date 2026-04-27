import Link from "next/link";

type HubTarget = {
  title: string;
  description: string;
  href: string;
  cta: string;
};

const targets: HubTarget[] = [
  {
    title: "Race Controller",
    description: "Admin, marshal logging, and real-time leaderboard operations.",
    href: "/controller",
    cta: "Open race controller",
  },
  {
    title: "Team Signup",
    description: "Public team registration intake and submission flow.",
    href: "/signups",
    cta: "Open team signup",
  },
  {
    title: "Documentation",
    description: "Race operations notes, setup, and future runbook entries.",
    href: "/docs",
    cta: "Open docs",
  },
  {
    title: "Status",
    description: "System status page and race-day alerts.",
    href: "/status",
    cta: "Open status",
  },
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
            <Link className="cc-link" href={target.href}>
              {target.cta}
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
