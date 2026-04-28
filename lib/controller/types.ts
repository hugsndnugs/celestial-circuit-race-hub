export type RaceStatus = "planned" | "active" | "completed";
export type EventSource = "marshal_tap" | "admin_correction";
export type CorrectionRequestStatus = "pending" | "approved" | "rejected" | "applied" | "failed";
export type NotificationStatus = "pending" | "sent" | "failed";
export type SignupStatus = "pending" | "approved" | "rejected" | "spam";

export interface Race {
  id: string;
  code: string;
  name: string;
  status: RaceStatus;
  startedAt: string | null;
  endedAt: string | null;
}

export interface Team {
  id: string;
  raceId: string;
  name: string;
  members: string[];
  createdAt: string;
}

export interface SignupRequest {
  id: string;
  teamName: string;
  captainDiscord: string;
  teammatesDiscord: string | null;
  contactEmail: string | null;
  notes: string | null;
  status: SignupStatus;
  source: "public_signup" | "admin" | "import";
  submittedAt: string;
}

export interface RelayPoint {
  id: string;
  raceId: string;
  sequenceIndex: number;
  name: string;
}

export interface RelayEvent {
  id: string;
  raceId: string;
  teamId: string;
  relayPointId: string;
  recordedAt: string;
  effectiveRecordedAt: string;
  recordedBy: string;
  source: EventSource;
  supersedesEventId: string | null;
  correctionReason: string | null;
  invalidatedByEventId: string | null;
}

export interface CorrectionRequest {
  id: string;
  raceId: string;
  supersedesEventId: string;
  requestedBy: string;
  reason: string;
  status: CorrectionRequestStatus;
  submittedAt: string;
  effectiveRecordedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  appliedEventId: string | null;
  idempotencyKey: string;
}

export interface RaceIncidentNote {
  id: string;
  raceId: string;
  note: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface NotificationOutboxEntry {
  id: string;
  raceId: string;
  correctionRequestId: string | null;
  topic: string;
  payload: string;
  status: NotificationStatus;
  attempts: number;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface LeaderboardRow {
  teamId: string;
  teamName: string;
  completedRelayPoints: number;
  lastRecordedAt: string | null;
  elapsedSeconds: number | null;
}
