import { z } from "zod";

const raceCodePattern = /^[a-z]+-[a-z]+-\d{2}$/;
export const raceRefSchema = z.string().refine(
  (value) => z.uuid().safeParse(value).success || raceCodePattern.test(value),
  "Race ID must be a UUID or race code like solar-fox-42.",
);

export const createRaceSchema = z.object({
  name: z.string().min(2),
  relayPoints: z.array(z.string().min(1)).min(1),
});

export const createTeamSchema = z.object({
  raceId: raceRefSchema,
  name: z.string().min(2),
  members: z.array(z.string().min(1)).min(1),
});

export const relayPassSchema = z.object({
  raceId: raceRefSchema,
  teamId: z.uuid(),
  relayPointId: z.uuid(),
  recordedBy: z
    .string()
    .trim()
    .regex(/^marshal:.+$/i, "recordedBy must start with marshal:")
    .transform((value) => value.toLowerCase()),
});

export const correctionSchema = z.object({
  raceId: raceRefSchema,
  supersedesEventId: z.uuid(),
  recordedBy: z.string().min(1),
  reason: z.string().min(3),
  effectiveRecordedAt: z.iso.datetime().optional(),
});

export const createCorrectionRequestSchema = z.object({
  raceId: raceRefSchema,
  supersedesEventId: z.uuid(),
  requestedBy: z.email(),
  reason: z.string().min(3),
  effectiveRecordedAt: z.iso.datetime(),
  idempotencyKey: z.string().min(8),
});

export const raceIncidentNoteSchema = z.object({
  raceId: raceRefSchema,
  note: z.string().trim().min(3).max(2000),
  createdBy: z.email(),
});

export const raceStatusDetailsSchema = z.object({
  raceId: raceRefSchema,
  statusNote: z.string().trim().max(500).nullable(),
  weatherNote: z.string().trim().max(200).nullable(),
  isLiveOverride: z.boolean().nullable(),
});
