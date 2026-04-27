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
    <div className="cc-card mx-auto max-w-3xl space-y-4">
      <h1 className="font-brand text-3xl font-semibold tracking-wide">{copy.title}</h1>
      <p className="text-cc-text/85">{copy.body}</p>
      <Link href="/signups" className="cc-btn-primary inline-flex">Back to form</Link>
    </div>
  );
}

export default function SubmittedPage() {
  return (
    <div className="min-h-screen">
      <BrandHeader title="Confirmation" />
      <main className="mx-auto max-w-[1140px] px-4 py-8 sm:px-7">
        <Suspense fallback={<div className="cc-card mx-auto max-w-3xl">Loading...</div>}>
          <SubmittedContent />
        </Suspense>
      </main>
    </div>
  );
}
