"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCurrentUserEmail, isAllowedAdmin, isAllowedDeveloper } from "@/lib/controller/admin-auth";

type HubTarget = {
  title: string;
  description: string;
  href: string;
  cta: string;
};

const targets: HubTarget[] = [
  {
    title: "Team Signup",
    description: "Public team registration intake and submission flow.",
    href: "/signups",
    cta: "Open team signup",
  },
  {
    title: "Race Rules and Terms",
    description: "Public race regulations, terms of service, and legal notices.",
    href: "/docs",
    cta: "Open race docs",
  },
  {
    title: "Status",
    description: "System status page and race-day alerts.",
    href: "/status",
    cta: "Open status",
  },
];

export default function HomePage() {
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [showRaceControllerCard, setShowRaceControllerCard] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function checkControllerAccess() {
      try {
        const email = await getCurrentUserEmail();
        if (!email) {
          if (!isMounted) return;
          setShowRaceControllerCard(false);
          return;
        }
        const [adminAllowed, developerAllowed] = await Promise.all([isAllowedAdmin(email), isAllowedDeveloper(email)]);
        if (!isMounted) return;
        setShowRaceControllerCard(adminAllowed || developerAllowed);
      } catch {
        if (!isMounted) return;
        setShowRaceControllerCard(false);
      } finally {
        if (!isMounted) return;
        setIsCheckingAccess(false);
      }
    }
    void checkControllerAccess();
    return () => {
      isMounted = false;
    };
  }, []);

  const visibleTargets = useMemo(() => {
    if (!showRaceControllerCard) return targets;
    return [
      {
        title: "Race Controller",
        description: "Admin, marshal logging, and real-time leaderboard operations.",
        href: "/controller",
        cta: "Open race controller",
      },
      ...targets,
    ];
  }, [showRaceControllerCard]);

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
        {(isCheckingAccess ? targets : visibleTargets).map((target) => (
          <article key={target.title} className="card">
            <h2>{target.title}</h2>
            <p className="muted">{target.description}</p>
            <Link className="cc-link" href={target.href}>
              {target.cta}
            </Link>
          </article>
        ))}
      </section>
      <footer className="footer">
        <p>
          Staff access: <Link href="/signin">Sign in</Link>
        </p>
      </footer>
    </main>
  );
}
