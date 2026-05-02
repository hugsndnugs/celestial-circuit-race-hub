import test from "node:test";
import assert from "node:assert/strict";
import { computeLeaderboard } from "../lib/controller/ranking";
import type { Race, RelayEvent, RelayPoint, Team } from "../lib/controller/types";

function baseRace(): Race {
  return {
    id: "race-1",
    code: "solar-aurora-42",
    name: "Race",
    status: "active",
    startedAt: "2026-01-01T00:00:00.000Z",
    endedAt: null,
    statusNote: null,
    weatherNote: null,
    isLiveOverride: null,
    nextStatusEta: null,
    nextStatusEtaNote: null,
  };
}

const relayPoints: RelayPoint[] = [
  { id: "p1", raceId: "race-1", sequenceIndex: 1, name: "Start" },
  { id: "p2", raceId: "race-1", sequenceIndex: 2, name: "Mid" },
];

const teams: Team[] = [
  { id: "t1", raceId: "race-1", name: "A Team", members: ["a"], createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "t2", raceId: "race-1", name: "B Team", members: ["b"], createdAt: "2026-01-01T00:00:00.000Z" },
];

test("computeLeaderboard ranks by completed points then earliest time", () => {
  const relayEvents: RelayEvent[] = [
    {
      id: "e1",
      raceId: "race-1",
      teamId: "t1",
      relayPointId: "p1",
      recordedAt: "2026-01-01T00:01:00.000Z",
      effectiveRecordedAt: "2026-01-01T00:01:00.000Z",
      recordedBy: "marshal:1",
      source: "marshal_tap",
      supersedesEventId: null,
      correctionReason: null,
      invalidatedByEventId: null,
    },
    {
      id: "e2",
      raceId: "race-1",
      teamId: "t2",
      relayPointId: "p1",
      recordedAt: "2026-01-01T00:00:50.000Z",
      effectiveRecordedAt: "2026-01-01T00:00:50.000Z",
      recordedBy: "marshal:1",
      source: "marshal_tap",
      supersedesEventId: null,
      correctionReason: null,
      invalidatedByEventId: null,
    },
    {
      id: "e3",
      raceId: "race-1",
      teamId: "t2",
      relayPointId: "p2",
      recordedAt: "2026-01-01T00:02:00.000Z",
      effectiveRecordedAt: "2026-01-01T00:02:00.000Z",
      recordedBy: "marshal:1",
      source: "marshal_tap",
      supersedesEventId: null,
      correctionReason: null,
      invalidatedByEventId: null,
    },
  ];

  const rows = computeLeaderboard({ race: baseRace(), teams, relayPoints, relayEvents });
  assert.equal(rows[0]?.teamId, "t2");
  assert.equal(rows[0]?.completedRelayPoints, 2);
  assert.equal(rows[0]?.elapsedSeconds, 120);
});

test("computeLeaderboard counts distinct relay points only when duplicate events exist", () => {
  const relayEvents: RelayEvent[] = [
    {
      id: "e1",
      raceId: "race-1",
      teamId: "t1",
      relayPointId: "p1",
      recordedAt: "2026-01-01T00:01:00.000Z",
      effectiveRecordedAt: "2026-01-01T00:01:00.000Z",
      recordedBy: "marshal:1",
      source: "marshal_tap",
      supersedesEventId: null,
      correctionReason: null,
      invalidatedByEventId: null,
    },
    {
      id: "e1b",
      raceId: "race-1",
      teamId: "t1",
      relayPointId: "p1",
      recordedAt: "2026-01-01T00:02:00.000Z",
      effectiveRecordedAt: "2026-01-01T00:02:00.000Z",
      recordedBy: "marshal:1",
      source: "marshal_tap",
      supersedesEventId: null,
      correctionReason: null,
      invalidatedByEventId: null,
    },
  ];
  const rows = computeLeaderboard({ race: baseRace(), teams: [teams[0]!], relayPoints, relayEvents });
  const t1 = rows.find((row) => row.teamId === "t1");
  assert.equal(t1?.completedRelayPoints, 1);
});

test("computeLeaderboard breaks ties with team name", () => {
  const relayEvents: RelayEvent[] = [
    {
      id: "e1",
      raceId: "race-1",
      teamId: "t1",
      relayPointId: "p1",
      recordedAt: "2026-01-01T00:01:00.000Z",
      effectiveRecordedAt: "2026-01-01T00:01:00.000Z",
      recordedBy: "marshal:1",
      source: "marshal_tap",
      supersedesEventId: null,
      correctionReason: null,
      invalidatedByEventId: null,
    },
    {
      id: "e2",
      raceId: "race-1",
      teamId: "t2",
      relayPointId: "p1",
      recordedAt: "2026-01-01T00:01:00.000Z",
      effectiveRecordedAt: "2026-01-01T00:01:00.000Z",
      recordedBy: "marshal:1",
      source: "marshal_tap",
      supersedesEventId: null,
      correctionReason: null,
      invalidatedByEventId: null,
    },
  ];
  const rows = computeLeaderboard({ race: baseRace(), teams, relayPoints, relayEvents });
  assert.equal(rows[0]?.teamName, "A Team");
  assert.equal(rows[1]?.teamName, "B Team");
});

test("computeLeaderboard ignores invalidated events", () => {
  const relayEvents: RelayEvent[] = [
    {
      id: "e1",
      raceId: "race-1",
      teamId: "t1",
      relayPointId: "p1",
      recordedAt: "2026-01-01T00:01:00.000Z",
      effectiveRecordedAt: "2026-01-01T00:01:00.000Z",
      recordedBy: "marshal:1",
      source: "marshal_tap",
      supersedesEventId: null,
      correctionReason: null,
      invalidatedByEventId: "e2",
    },
  ];
  const rows = computeLeaderboard({ race: baseRace(), teams, relayPoints, relayEvents });
  const t1 = rows.find((row) => row.teamId === "t1");
  assert.equal(t1?.completedRelayPoints, 0);
});
