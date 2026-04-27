import { type LeaderboardRow, type Race, type RelayEvent, type RelayPoint, type Team } from "@/lib/controller/types";

interface RankingInput {
  race: Race;
  teams: Team[];
  relayPoints: RelayPoint[];
  relayEvents: RelayEvent[];
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

  const rows: LeaderboardRow[] = teams.map((team) => {
    const events = (teamEvents.get(team.id) ?? []).sort((a, b) => {
      const seqDiff = (relayPointOrder.get(a.relayPointId) ?? 9999) - (relayPointOrder.get(b.relayPointId) ?? 9999);
      if (seqDiff !== 0) return seqDiff;
      return new Date(a.effectiveRecordedAt).getTime() - new Date(b.effectiveRecordedAt).getTime();
    });
    const last = events.at(-1) ?? null;
    const elapsed = race.startedAt && last ? Math.floor((new Date(last.effectiveRecordedAt).getTime() - new Date(race.startedAt).getTime()) / 1000) : null;
    return {
      teamId: team.id,
      teamName: team.name,
      completedRelayPoints: events.length,
      lastRecordedAt: last?.effectiveRecordedAt ?? null,
      elapsedSeconds: elapsed,
    };
  });

  return rows.sort((a, b) => {
    if (b.completedRelayPoints !== a.completedRelayPoints) return b.completedRelayPoints - a.completedRelayPoints;
    if (!a.lastRecordedAt && !b.lastRecordedAt) return a.teamName.localeCompare(b.teamName);
    if (!a.lastRecordedAt) return 1;
    if (!b.lastRecordedAt) return -1;
    return new Date(a.lastRecordedAt).getTime() - new Date(b.lastRecordedAt).getTime();
  });
}
