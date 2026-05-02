import test from "node:test";
import assert from "node:assert/strict";
import { createRaceSchema, raceRefSchema, relayPassSchema } from "../lib/controller/validators";
import { validateSignupPayload } from "../lib/signups/validation";

test("raceRefSchema accepts race code and UUID", () => {
  assert.equal(raceRefSchema.parse("solar-lunar-42"), "solar-lunar-42");
  assert.equal(
    raceRefSchema.parse("550e8400-e29b-41d4-a716-446655440000"),
    "550e8400-e29b-41d4-a716-446655440000"
  );
});

test("raceRefSchema rejects invalid references", () => {
  assert.equal(raceRefSchema.safeParse("not-a-valid-code").success, false);
  assert.equal(raceRefSchema.safeParse("Solar-Lunar-42").success, false);
});

test("relayPassSchema rejects recordedBy without marshal prefix", () => {
  const result = relayPassSchema.safeParse({
    raceId: "solar-lunar-42",
    teamId: "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee",
    relayPointId: "bbbbbbbb-cccc-4ddd-eeee-ffffffffffff",
    recordedBy: "admin:someone",
  });
  assert.equal(result.success, false);
});

test("createRaceSchema rejects whitespace-only name", () => {
  const result = createRaceSchema.safeParse({ name: "   ", relayPoints: ["A"] });
  assert.equal(result.success, false);
});

test("validateSignupPayload normalizes optional values", () => {
  const result = validateSignupPayload({
    team_name: "  Orbit Squad  ",
    captain_discord: "  @captain  ",
    teammates_discord: "   ",
    contact_email: "  Test@Example.com  ",
    notes: "  hello  ",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.team_name, "Orbit Squad");
    assert.equal(result.data.contact_email, "test@example.com");
    assert.equal(result.data.teammates_discord, undefined);
  }
});

test("validateSignupPayload returns field errors", () => {
  const result = validateSignupPayload({
    team_name: "",
    captain_discord: "",
    teammates_discord: "",
    contact_email: "bad-email",
    notes: "",
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.team_name);
    assert.ok(result.errors.captain_discord);
    assert.ok(result.errors.contact_email);
  }
});
