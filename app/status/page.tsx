"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getRaces } from "@/lib/controller/race-service";
import { Race } from "@/lib/controller/types";
import { getSupabaseBrowser } from "@/lib/signups/supabaseBrowser";

const formatTimestamp = (value: string | null) => {
  if (!value) return "unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "unknown" : date.toLocaleString();
};

function isRaceLive(race: Race): boolean {
  return race.isLiveOverride ?? race.status === "active";
}

function RaceList({ races, emptyLabel }: Readonly<{ races: Race[]; emptyLabel: string }>) {
  if (races.length === 0) return <p>{emptyLabel}</p>;
  return (
    <ul>
      {races.map((race) => (
        <li key={race.id}>
          <strong>{race.name}</strong> ({race.code}) - {isRaceLive(race) ? "LIVE" : "not live"}
          <br />
          Lifecycle status: {race.status}
          {race.startedAt ? ` - started ${formatTimestamp(race.startedAt)}` : ""}
          {race.endedAt ? ` - ended ${formatTimestamp(race.endedAt)}` : ""}
          {race.statusNote ? ` - update: ${race.statusNote}` : ""}
          {race.weatherNote ? ` - weather: ${race.weatherNote}` : ""}
          {race.nextStatusEta ? ` - next update ETA: ${formatTimestamp(race.nextStatusEta)}` : ""}
          {race.nextStatusEtaNote ? ` (${race.nextStatusEtaNote})` : ""}
          <br />
          <Link href={`/leaderboard/${race.code}`}>View leaderboard</Link>
        </li>
      ))}
    </ul>
  );
}

export default function StatusPage() {
  const pageTitle = process.env.NEXT_PUBLIC_STATUS_PAGE_TITLE || "Celestial Circuit Race Status";
  const [races, setRaces] = useState<Race[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [sourceMessage, setSourceMessage] = useState("Loading race status...");

  useEffect(() => {
    let cancelled = false;
    const loadStatus = async () => {
      try {
        const nextRaces = await getRaces();
        if (cancelled) return;
        setRaces(nextRaces);
        setLastUpdated(new Date().toISOString());
        setSourceMessage("Live race status is sourced from race control records.");
      } catch {
        if (cancelled) return;
        setRaces([]);
        setLastUpdated(null);
        setSourceMessage("Race status is currently unavailable.");
      }
    };
    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    const channel = supabase
      .channel("status:races")
      .on("postgres_changes", { event: "*", schema: "public", table: "races" }, () => {
        void getRaces().then((nextRaces) => {
          setRaces(nextRaces);
          setLastUpdated(new Date().toISOString());
        });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const lastUpdatedLabel = useMemo(() => formatTimestamp(lastUpdated), [lastUpdated]);
  const liveRaces = useMemo(() => races.filter((race) => isRaceLive(race)), [races]);
  const upcomingRaces = useMemo(
    () => races.filter((race) => !isRaceLive(race) && race.status === "planned"),
    [races]
  );
  const completedRaces = useMemo(
    () => races.filter((race) => !isRaceLive(race) && race.status === "completed"),
    [races]
  );

  return (
    <main className="page-stack">
      <section className="card">
        <h1>{pageTitle}</h1>
        <p className="muted">
          Track upcoming and active races with live/manual operations updates.
        </p>
        <p className="muted">{sourceMessage}</p>
        <p className="muted">Last updated: {lastUpdatedLabel}</p>
      </section>
      <section className="card">
        <h2>Live Races</h2>
        <RaceList races={liveRaces} emptyLabel="No races are currently live." />
      </section>
      <section className="card">
        <h2>Upcoming Races</h2>
        <RaceList races={upcomingRaces} emptyLabel="No upcoming races are currently scheduled." />
      </section>
      <section className="card">
        <h2>Completed Races</h2>
        <RaceList races={completedRaces} emptyLabel="No completed races yet." />
      </section>
    </main>
  );
}
