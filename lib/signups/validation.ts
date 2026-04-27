import { z } from "zod";

const optionalMultiline = z.string().default("").transform((s) => s.trim()).transform((s) => (s.length === 0 ? undefined : s));

export const signupRequestSchema = z.object({
  team_name: z.string().trim().min(2, "Team name is required").max(120),
  captain_discord: z.string().trim().min(2, "Captain Discord mention is required").max(200, "Captain Discord mention is too long"),
  teammates_discord: optionalMultiline.pipe(z.string().max(4000, "Teammate mentions are too long").optional()),
  contact_email: z.preprocess((v) => (typeof v === "string" ? v.trim() : ""), z.union([z.literal(""), z.string().email("Enter a valid email").max(254)])).transform((s) => (s === "" ? undefined : s.toLowerCase())),
  notes: z.string().default("").transform((s) => s.trim()).transform((s) => (s.length === 0 ? undefined : s)).pipe(z.string().max(2000).optional()),
});

export type SignupRequestPayload = z.infer<typeof signupRequestSchema>;
export type FieldErrors = Partial<Record<keyof SignupRequestPayload | "_form", string>>;

export function validateSignupPayload(raw: Record<string, unknown>): { ok: true; data: SignupRequestPayload } | { ok: false; errors: FieldErrors } {
  const parsed = signupRequestSchema.safeParse(raw);
  if (parsed.success) return { ok: true, data: parsed.data };
  const errors: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !errors[key as keyof SignupRequestPayload]) {
      errors[key as keyof SignupRequestPayload] = issue.message;
    }
  }
  if (Object.keys(errors).length === 0) errors._form = "Please check your entries and try again.";
  return { ok: false, errors };
}
