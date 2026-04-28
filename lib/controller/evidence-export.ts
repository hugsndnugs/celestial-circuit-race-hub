import type { CorrectionRequest, LeaderboardRow, RaceIncidentNote, RelayEvent } from "@/lib/controller/types";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }
  return value;
}

function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) => row.map((cell) => escapeCsv(cell)).join(","));
  return `${lines.join("\n")}\n`;
}

export function relayEventsToCsv(events: RelayEvent[]): string {
  return toCsv(
    ["id", "teamId", "relayPointId", "recordedAt", "effectiveRecordedAt", "source", "recordedBy", "invalidatedByEventId"],
    events.map((event) => [
      event.id,
      event.teamId,
      event.relayPointId,
      event.recordedAt,
      event.effectiveRecordedAt,
      event.source,
      event.recordedBy,
      event.invalidatedByEventId ?? "",
    ])
  );
}

export function correctionsToCsv(requests: CorrectionRequest[]): string {
  return toCsv(
    ["id", "status", "supersedesEventId", "requestedBy", "submittedAt", "effectiveRecordedAt", "reviewedBy", "reviewedAt"],
    requests.map((request) => [
      request.id,
      request.status,
      request.supersedesEventId,
      request.requestedBy,
      request.submittedAt,
      request.effectiveRecordedAt,
      request.reviewedBy ?? "",
      request.reviewedAt ?? "",
    ])
  );
}

export function incidentsToCsv(notes: RaceIncidentNote[]): string {
  return toCsv(
    ["id", "createdAt", "createdBy", "createdByName", "note"],
    notes.map((note) => [note.id, note.createdAt, note.createdBy, note.createdByName, note.note])
  );
}

export function leaderboardToCsv(rows: LeaderboardRow[]): string {
  return toCsv(
    ["teamId", "teamName", "completedRelayPoints", "lastRecordedAt", "elapsedSeconds"],
    rows.map((row) => [
      row.teamId,
      row.teamName,
      String(row.completedRelayPoints),
      row.lastRecordedAt ?? "",
      row.elapsedSeconds === null ? "" : String(row.elapsedSeconds),
    ])
  );
}
