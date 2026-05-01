"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/signups/supabaseBrowser";
import { getCurrentUserEmail, isAllowedDeveloper } from "@/lib/controller/admin-auth";

export default function DeveloperSignInPage() {
  const supabase = getSupabaseBrowser();
  const [email, setEmail] = useState("");
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [hasDeveloperAccess, setHasDeveloperAccess] = useState(false);
  const [status, setStatus] = useState("Enter your developer email to sign in.");

  const redirectUrl =
    globalThis.location === undefined
      ? "/dev/signin"
      : `${globalThis.location.origin}/dev/signin`;

  useEffect(() => {
    let isMounted = true;
    async function loadSessionState() {
      const currentEmail = await getCurrentUserEmail();
      if (!isMounted) return;
      setSignedInEmail(currentEmail);
      if (!currentEmail) {
        setHasDeveloperAccess(false);
        return;
      }
      const allowed = await isAllowedDeveloper(currentEmail);
      if (!isMounted) return;
      setHasDeveloperAccess(allowed);
    }
    void loadSessionState();
    return () => {
      isMounted = false;
    };
  }, []);

  async function sendMagicLink(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!supabase) {
      setStatus("Developer auth is unavailable on this deployment.");
      return;
    }
    if (!email.trim()) {
      setStatus("Enter an email to continue.");
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: redirectUrl },
    });
    if (error) {
      setStatus("Failed to send sign-in email.");
      return;
    }
    setStatus("Developer magic link sent. Complete sign-in from your email.");
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSignedInEmail(null);
    setHasDeveloperAccess(false);
    setStatus("Signed out.");
  }

  return (
    <main className="page-stack">
      <section className="card">
        <h1>Developer Sign-In</h1>
        <p className="muted">Sign in for internal engineering docs access. This does not grant race director controls.</p>
        <p>
          Prefer the centralized <Link href="/signin">/signin</Link> page for all role sign-in flows.
        </p>
        <p>
          Allowlisted developer emails can access docs after sign-in. Configure{" "}
          <code>NEXT_PUBLIC_DEV_EMAILS</code> for dev-only access and <code>NEXT_PUBLIC_ADMIN_EMAILS</code> for admin access.
        </p>
      </section>

      <section className="card">
        {signedInEmail ? (
          <>
            <p>Signed in as {signedInEmail}</p>
            <p>{hasDeveloperAccess ? "Developer access granted." : "Access denied. You do not have this role."}</p>
            <p>
              <Link href="/docs">Open docs</Link>
            </p>
            <button type="button" className="secondary" onClick={() => void signOut()}>
              Sign out
            </button>
          </>
        ) : (
          <form onSubmit={sendMagicLink} className="section-stack">
            <label htmlFor="devSignInEmail">Developer email</label>
            <input
              id="devSignInEmail"
              type="email"
              value={email}
              onChange={(eventItem) => setEmail(eventItem.target.value)}
              placeholder="dev@example.com"
            />
            <button type="submit">Send magic link</button>
          </form>
        )}
        <p>{status}</p>
      </section>
    </main>
  );
}
