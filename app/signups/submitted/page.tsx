"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { BrandHeader } from "@/components/signups/BrandHeader";

function SubmittedContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const copy = useMemo(() => {
    if (reason === "duplicate") {
      return { title: "Possible duplicate", body: "We already have a recent signup with this team name, captain Discord, or contact email." };
    }
    return { title: "Thank you", body: "Your team signup was received. Organizers will review pending registrations before race day." };
  }, [reason]);
  return (
    <div className="cc-card signup-submitted-card">
      <h1 className="signup-title">{copy.title}</h1>
      <p className="signup-copy">{copy.body}</p>
      <Link href="/signups" className="cc-btn-primary">Back to form</Link>
    </div>
  );
}

export default function SubmittedPage() {
  return (
    <div className="signup-shell">
      <BrandHeader title="Confirmation" />
      <main className="signup-main page-stack">
        <Suspense fallback={<div className="cc-card signup-submitted-card">Loading...</div>}>
          <SubmittedContent />
        </Suspense>
      </main>
    </div>
  );
}
