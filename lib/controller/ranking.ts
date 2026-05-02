import { type LeaderboardRow, type Race, type RelayEvent, type RelayPoint, type Team } from "@/lib/controller/types";

interface RankingInput {
  race: Race;
  teams: Team[];
  relayPoints: RelayPoint[];
  relayEvents: RelayEvent[];
}

function safeGetTime(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

export function computeLeaderboard(input: RankingInput): LeaderboardRow[] {
  const { race, teams, relayPoints, relayEvents } = input;
  const activeRelayEvents = relayEvents.filter((event) => !event.invalidatedByEventId);
  const relayPointOrder = new Map(relayPoints.map((point) => [point.id, point.sequenceIndex]));
  const teamEvents = new Map<string, RelayEvent[]>();

  for (const event of activeRelayEvents) {
    const current = teamEvents.get(event.teamId) ?? [];
    current.push(event);
    teamEvents.set(event.teamId, current);
  }

  const startedAtMs = safeGetTime(race.startedAt);

  const rows: LeaderboardRow[] = teams.map((team) => {
    const events = (teamEvents.get(team.id) ?? []).sort((a, b) => {
      const seqDiff = (relayPointOrder.get(a.relayPointId) ?? 9999) - (relayPointOrder.get(b.relayPointId) ?? 9999);
      if (seqDiff !== 0) return seqDiff;
      const ta = safeGetTime(a.effectiveRecordedAt);
      const tb = safeGetTime(b.effectiveRecordedAt);
      if (ta === null && tb === null) return 0;
      if (ta === null) return 1;
      if (tb === null) return -1;
      return ta - tb;
    });
    const distinctRelayPointIds = new Set(events.map((event) => event.relayPointId));
    const completedRelayPoints = distinctRelayPointIds.size;
    const last = events.at(-1) ?? null;
    const lastMs = last ? safeGetTime(last.effectiveRecordedAt) : null;
    const lastRecordedAt = lastMs !== null ? last?.effectiveRecordedAt ?? null : null;
    let elapsedSeconds: number | null = null;
    if (startedAtMs !== null && lastMs !== null) {
      elapsedSeconds = Math.floor((lastMs - startedAtMs) / 1000);
      if (!Number.isFinite(elapsedSeconds)) elapsedSeconds = null;
    }
    return {
      teamId: team.id,
      teamName: team.name,
      completedRelayPoints,
      lastRecordedAt,
      elapsedSeconds,
    };
  });

  return rows.sort((a, b) => {
    if (b.completedRelayPoints !== a.completedRelayPoints) return b.completedRelayPoints - a.completedRelayPoints;
    const ta = a.lastRecordedAt ? safeGetTime(a.lastRecordedAt) : null;
    const tb = b.lastRecordedAt ? safeGetTime(b.lastRecordedAt) : null;
    if (ta === null && tb === null) return a.teamName.localeCompare(b.teamName);
    if (ta === null) return 1;
    if (tb === null) return -1;
    if (ta !== tb) return ta - tb;
    return a.teamName.localeCompare(b.teamName);
  });
}
