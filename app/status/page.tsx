"use client";

import { useEffect, useMemo, useState } from "react";

type ServiceState = "operational" | "degraded";
type StatusItem = { component: string; url: string; state: ServiceState; note: string; checkedAt: string; httpStatus: number | null };
type StatusPayload = { lastUpdated: string; services: StatusItem[] };

const fallbackItems: StatusItem[] = [
  { component: "Race Controller", url: "/controller", state: "degraded", note: "Status feed unavailable.", checkedAt: "", httpStatus: null },
  { component: "Race Hub", url: "/", state: "degraded", note: "Status feed unavailable.", checkedAt: "", httpStatus: null },
  { component: "Race Signups", url: "/signups", state: "degraded", note: "Status feed unavailable.", checkedAt: "", httpStatus: null },
  { component: "Race Docs", url: "/docs", state: "degraded", note: "Status feed unavailable.", checkedAt: "", httpStatus: null },
];

const formatTimestamp = (value: string | null) => {
  if (!value) return "unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "unknown" : date.toLocaleString();
};

export default function StatusPage() {
  const pageTitle = process.env.NEXT_PUBLIC_STATUS_PAGE_TITLE || "Celestial Circuit Status";
  const [statusItems, setStatusItems] = useState<StatusItem[]>(fallbackItems);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [sourceMessage, setSourceMessage] = useState("Loading latest probe snapshot...");

  useEffect(() => {
    let cancelled = false;
    const loadStatus = async () => {
      try {
        const response = await fetch("/status.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as StatusPayload;
        if (cancelled) return;
        setStatusItems(Array.isArray(payload.services) ? payload.services : fallbackItems);
        setLastUpdated(payload.lastUpdated || null);
        setSourceMessage("Live status is sourced from the latest GitHub Actions probe.");
      } catch {
        if (cancelled) return;
        setStatusItems(fallbackItems);
        setLastUpdated(null);
        setSourceMessage("Status feed unavailable. Showing fallback service list.");
      }
    };
    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  const lastUpdatedLabel = useMemo(() => formatTimestamp(lastUpdated), [lastUpdated]);

  return (
    <main>
      <section className="card">
        <h1>{pageTitle}</h1>
        <p className="muted">Real endpoint availability across the Celestial Circuit network.</p>
        <p className="muted">{sourceMessage}</p>
        <p className="muted">Last updated: {lastUpdatedLabel}</p>
      </section>
      <section className="card">
        <h2>Current Services</h2>
        <ul>
          {statusItems.map((item) => (
            <li key={item.component}><strong>{item.component}:</strong> {item.state} - {item.note} ({item.url})</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
