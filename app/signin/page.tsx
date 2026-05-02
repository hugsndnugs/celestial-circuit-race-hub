"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentUserEmail, isAllowedAdmin, isAllowedDeveloper, isAllowedMarshal, isAllowedRaceControl } from "@/lib/controller/admin-auth";
import { getSupabaseBrowser } from "@/lib/signups/supabaseBrowser";

export default function UnifiedSignInPage() {
  const supabase = getSupabaseBrowser();
  const [email, setEmail] = useState("");
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [hasDeveloperAccess, setHasDeveloperAccess] = useState(false);
  const [hasMarshalAccess, setHasMarshalAccess] = useState(false);
  const [hasRaceControlAccess, setHasRaceControlAccess] = useState(false);
  const [status, setStatus] = useState("Enter your email to sign in.");

  const redirectUrl =
    typeof globalThis.window === "undefined"
      ? `${(process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "") || ""}/signin`
      : `${globalThis.window.location.origin}${globalThis.window.location.pathname}`;

  useEffect(() => {
    let isMounted = true;
    async function loadSessionState() {
      const currentEmail = await getCurrentUserEmail();
      if (!isMounted) return;
      setSignedInEmail(currentEmail);
      if (!currentEmail) {
        setHasAdminAccess(false);
        setHasDeveloperAccess(false);
        setHasMarshalAccess(false);
        setHasRaceControlAccess(false);
        return;
      }
      const [adminAllowed, developerAllowed, marshalAllowed, raceControlAllowed] = await Promise.all([
        isAllowedAdmin(currentEmail),
        isAllowedDeveloper(currentEmail),
        isAllowedMarshal(currentEmail),
        isAllowedRaceControl(currentEmail),
      ]);
      if (!isMounted) return;
      setHasAdminAccess(adminAllowed);
      setHasDeveloperAccess(developerAllowed);
      setHasMarshalAccess(marshalAllowed);
      setHasRaceControlAccess(raceControlAllowed);
    }
    void loadSessionState();
    return () => {
      isMounted = false;
    };
  }, []);

  async function sendMagicLink(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (!supabase) {
      setStatus("Sign-in is unavailable on this deployment.");
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
    setStatus("Magic link sent. Complete sign-in from your email.");
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSignedInEmail(null);
    setHasAdminAccess(false);
    setHasDeveloperAccess(false);
    setHasMarshalAccess(false);
    setHasRaceControlAccess(false);
    setStatus("Signed out.");
  }

  return (
    <main className="page-stack">
      <section className="card">
        <h1>Sign In</h1>
        <p className="muted">Centralized sign-in for admin, race control, marshal, and developer access.</p>
        <p>
          Authorization is Supabase-first. Optional env fallback is available via <code>NEXT_PUBLIC_ADMIN_EMAILS</code>,{" "}
          <code>NEXT_PUBLIC_RACECONTROL_EMAILS</code>, <code>NEXT_PUBLIC_DEV_EMAILS</code>, and{" "}
          <code>NEXT_PUBLIC_MARSHAL_EMAILS</code>.
        </p>
      </section>
      <section className="card">
        {signedInEmail ? (
          <>
            <p>Signed in as {signedInEmail}</p>
            <p>
              Access: {hasAdminAccess ? "Admin" : "No admin"} | {hasRaceControlAccess ? "Race control" : "No race control"} |{" "}
              {hasMarshalAccess ? "Marshal" : "No marshal"} |{" "}
              {hasDeveloperAccess ? "Developer" : "No developer"}
            </p>
            <p>
              <Link href="/controller">Race Controller</Link> | <Link href="/controller/admin">Admin Console</Link> |{" "}
              <Link href="/controller/marshal">Marshal View</Link> |{" "}
              <Link href="/docs">Docs</Link>
            </p>
            <button type="button" className="secondary" onClick={() => void signOut()}>
              Sign out
            </button>
          </>
        ) : (
          <form onSubmit={sendMagicLink} className="section-stack">
            <label htmlFor="signInEmail">Email</label>
            <input
              id="signInEmail"
              type="email"
              value={email}
              onChange={(eventItem) => setEmail(eventItem.target.value)}
              placeholder="you@example.com"
            />
            <button type="submit">Send magic link</button>
          </form>
        )}
        <p role="status" aria-live="polite">{status}</p>
      </section>
    </main>
  );
}
