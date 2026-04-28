import test from "node:test";
import assert from "node:assert/strict";
import { raceRefSchema } from "../lib/controller/validators";
import { validateSignupPayload } from "../lib/signups/validation";

test("raceRefSchema accepts race code and UUID", () => {
  assert.equal(raceRefSchema.parse("solar-lunar-42"), "solar-lunar-42");
  assert.equal(
    raceRefSchema.parse("550e8400-e29b-41d4-a716-446655440000"),
    "550e8400-e29b-41d4-a716-446655440000"
  );
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
