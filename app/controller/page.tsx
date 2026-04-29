"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentUserEmail, isAllowedAdmin, isAllowedDeveloper } from "@/lib/controller/admin-auth";

export default function ControllerHomePage() {
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [hasControllerAccess, setHasControllerAccess] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function checkAccess() {
      try {
        const email = await getCurrentUserEmail();
        if (!isMounted) return;
        setSignedInEmail(email);
        if (!email) {
          setHasControllerAccess(false);
          return;
        }
        const [adminAllowed, developerAllowed] = await Promise.all([isAllowedAdmin(email), isAllowedDeveloper(email)]);
        if (!isMounted) return;
        setHasControllerAccess(adminAllowed || developerAllowed);
      } catch {
        if (!isMounted) return;
        setHasControllerAccess(false);
      } finally {
        if (!isMounted) return;
        setIsCheckingAccess(false);
      }
    }
    void checkAccess();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isCheckingAccess) {
    return (
      <main className="page-stack">
        <section className="card">
          <h1>Race Controller</h1>
          <p>Checking access...</p>
        </section>
      </main>
    );
  }

  if (!signedInEmail) {
    return (
      <main className="page-stack">
        <section className="card">
          <h1>Race Controller</h1>
          <p>You must be signed in to access race controller tools.</p>
          <p>
            <Link href="/signin">Sign in</Link>
          </p>
        </section>
      </main>
    );
  }

  if (!hasControllerAccess) {
    return (
      <main className="page-stack">
        <section className="card">
          <h1>Race Controller</h1>
          <p>Access denied. This account is not on the admin or developer allowlist.</p>
          <p>
            Signed in as {signedInEmail}. <Link href="/signin">Switch account</Link>
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-stack">
      <section className="card">
        <h1>Race Controller</h1>
        <p>Source of truth for race operations: signup, marshal logging, leaderboard, and audit corrections.</p>
      </section>
      <section className="grid" aria-label="Controller destinations">
        <section className="card">
          <h2>Admin</h2>
          <p>Create races, register teams, and start race execution.</p>
          <Link href="/controller/admin" className="button-link">
            Open admin console
          </Link>
        </section>
        <section className="card">
          <h2>Marshal</h2>
          <p>One-tap pass logging designed for mobile race-day usage.</p>
          <Link href="/controller/marshal" className="button-link">
            Open marshal view
          </Link>
        </section>
        <section className="card">
          <h2>Leaderboard</h2>
          <p>Real-time ordering by relay sequence and recorded server timestamp.</p>
          <Link href="/controller/leaderboard" className="button-link">
            Open leaderboard
          </Link>
        </section>
      </section>
    </main>
  );
}
