"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import { getSupabaseBrowser } from "@/lib/signups/supabaseBrowser";
import { canSubmitNow, markSubmittedNow, msUntilNextSubmit } from "@/lib/signups/throttle";
import { type FieldErrors, validateSignupPayload } from "@/lib/signups/validation";

const DUPLICATE_FN = "team_signup_has_recent_duplicate";

export function SignupForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);
  const initial = useMemo(
    () => ({
      team_name: "",
      captain_discord: "",
      teammates_discord: "",
      contact_email: "",
      notes: "",
    }),
    []
  );
  const [values, setValues] = useState(initial);

  const onSubmit = useCallback(
    async (e: SyntheticEvent<HTMLFormElement>) => {
      e.preventDefault();
      setErrors({});
      setConfigError(null);
      if (!canSubmitNow()) {
        const wait = Math.ceil(msUntilNextSubmit() / 1000);
        setErrors({
          _form: `Please wait ${wait}s before submitting again.`,
        });
        return;
      }
      const parsed = validateSignupPayload({
        team_name: values.team_name,
        captain_discord: values.captain_discord,
        teammates_discord: values.teammates_discord,
        contact_email: values.contact_email,
        notes: values.notes,
      });
      if (!parsed.ok) {
        setErrors(parsed.errors);
        globalThis.setTimeout(() => {
          errorSummaryRef.current?.focus();
        }, 0);
        return;
      }
      const supabase = getSupabaseBrowser();
      if (!supabase) {
        setConfigError("This form is not configured yet (missing Supabase environment variables).");
        return;
      }
      setSubmitting(true);
      try {
        const { data: isDup, error: dupErr } = await supabase.rpc(DUPLICATE_FN, {
          p_team_name: parsed.data.team_name,
          p_captain_discord: parsed.data.captain_discord,
          p_contact_email: parsed.data.contact_email ?? null,
          p_window_hours: 48,
        });
        if (dupErr) {
          console.warn("Duplicate check RPC failed (continuing):", dupErr);
        } else if (isDup === true) {
          router.push("/signups/submitted?reason=duplicate");
          return;
        }
        const row = {
          team_name: parsed.data.team_name,
          captain_discord: parsed.data.captain_discord,
          teammates_discord: parsed.data.teammates_discord ?? null,
          contact_email: parsed.data.contact_email ?? null,
          notes: parsed.data.notes ?? null,
          status: "pending",
          source: "public_signup",
        };
        const { error: insertErr } = await supabase.from("team_signup_requests").insert(row);
        if (insertErr) {
          if (insertErr.code === "23505" || insertErr.message?.toLowerCase().includes("duplicate")) {
            router.push("/signups/submitted?reason=duplicate");
            return;
          }
          setErrors({
            _form: "We could not save your signup right now. Please try again in a few minutes.",
          });
          return;
        }
        markSubmittedNow();
        router.push("/signups/submitted?reason=ok");
      } finally {
        setSubmitting(false);
      }
    },
    [router, values]
  );

  return (
    <form onSubmit={onSubmit} className="cc-card signup-form-card section-stack" noValidate>
      <p className="signup-copy">
        Register with your team name and Discord mentions. An email is optional if you want a non-Discord fallback for organizers.
      </p>
      {configError ? <p className="cc-error">{configError}</p> : null}
      {errors._form ? (
        <div ref={errorSummaryRef} tabIndex={-1} role="alert" aria-live="assertive">
          <p className="cc-error">{errors._form}</p>
        </div>
      ) : null}
      <div>
        <label className="cc-label" htmlFor="team_name">
          Team name
        </label>
        <input
          id="team_name"
          name="team_name"
          className="cc-input"
          required
          value={values.team_name}
          onChange={(e) => setValues((v) => ({ ...v, team_name: e.target.value }))}
          aria-invalid={errors.team_name ? true : undefined}
          aria-describedby={errors.team_name ? "team_name_error" : undefined}
        />
        {errors.team_name ? (
          <p id="team_name_error" className="cc-error">
            {errors.team_name}
          </p>
        ) : null}
      </div>
      <div>
        <label className="cc-label" htmlFor="captain_discord">
          Captain Discord
        </label>
        <input
          id="captain_discord"
          name="captain_discord"
          className="cc-input"
          required
          placeholder="@captain or <@123456789012345678>"
          autoComplete="off"
          value={values.captain_discord}
          onChange={(e) => setValues((v) => ({ ...v, captain_discord: e.target.value }))}
          aria-invalid={errors.captain_discord ? true : undefined}
          aria-describedby={errors.captain_discord ? "captain_discord_error" : undefined}
        />
        {errors.captain_discord ? (
          <p id="captain_discord_error" className="cc-error">
            {errors.captain_discord}
          </p>
        ) : null}
      </div>
      <div>
        <label className="cc-label" htmlFor="teammates_discord">
          Teammates Discord <span className="signup-helper">(optional)</span>
        </label>
        <textarea
          id="teammates_discord"
          name="teammates_discord"
          rows={4}
          className="cc-input signup-mono"
          placeholder={"@player1\n@player2\n<@123456789012345678>"}
          value={values.teammates_discord}
          onChange={(e) => setValues((v) => ({ ...v, teammates_discord: e.target.value }))}
          aria-invalid={errors.teammates_discord ? true : undefined}
          aria-describedby={errors.teammates_discord ? "teammates_discord_error" : undefined}
        />
        {errors.teammates_discord ? (
          <p id="teammates_discord_error" className="cc-error">
            {errors.teammates_discord}
          </p>
        ) : null}
      </div>
      <div>
        <label className="cc-label" htmlFor="contact_email">
          Contact email <span className="signup-helper">(optional)</span>
        </label>
        <input
          id="contact_email"
          name="contact_email"
          type="email"
          className="cc-input"
          autoComplete="email"
          value={values.contact_email}
          onChange={(e) => setValues((v) => ({ ...v, contact_email: e.target.value }))}
          aria-invalid={errors.contact_email ? true : undefined}
          aria-describedby={errors.contact_email ? "contact_email_error" : undefined}
        />
        {errors.contact_email ? (
          <p id="contact_email_error" className="cc-error">
            {errors.contact_email}
          </p>
        ) : null}
      </div>
      <div>
        <label className="cc-label" htmlFor="notes">
          Notes <span className="signup-helper">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          className="cc-input"
          value={values.notes}
          onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
          aria-invalid={errors.notes ? true : undefined}
          aria-describedby={errors.notes ? "notes_error" : undefined}
        />
        {errors.notes ? (
          <p id="notes_error" className="cc-error">
            {errors.notes}
          </p>
        ) : null}
      </div>
      <div className="signup-actions">
        <button type="submit" className="cc-btn-primary" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit registration"}
        </button>
      </div>
    </form>
  );
}
