import test from "node:test";
import assert from "node:assert/strict";
import { incidentsToCsv } from "../lib/controller/evidence-export";

test("incidentsToCsv neutralizes formula-like note cells", () => {
  const csv = incidentsToCsv([
    {
      id: "n1",
      raceId: "race-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      createdBy: "admin@test.com",
      createdByName: "Admin",
      note: "=cmd|'/c calc'!A0",
    },
  ]);
  assert.ok(csv.includes("'=cmd"));
});
