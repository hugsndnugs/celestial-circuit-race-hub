"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/signups/supabaseBrowser";
import { canSubmitNow, markSubmittedNow, msUntilNextSubmit } from "@/lib/signups/throttle";
import { type FieldErrors, validateSignupPayload } from "@/lib/signups/validation";

const DUPLICATE_FN = "team_signup_has_recent_duplicate";

export function SignupForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const initial = useMemo(
    () => ({
      team_name: "",
      captain_discord: "",
      teammates_discord: "",
      contact_email: "",
      notes: "",
      company_url: "",
    }),
    []
  );
  const [values, setValues] = useState(initial);

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setErrors({});
      setConfigError(null);
      if (values.company_url?.trim()) {
        router.push("/signups/submitted?reason=ok");
        return;
      }
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
    <form onSubmit={onSubmit} className="cc-card relative mx-auto max-w-3xl space-y-5" noValidate>
      <p className="text-cc-text/80">
        Register with your team name and Discord mentions. An email is optional if you want a non-Discord fallback for organizers.
      </p>
      {configError ? <p className="cc-error">{configError}</p> : null}
      {errors._form ? <p className="cc-error">{errors._form}</p> : null}
      <div>
        <label className="cc-label" htmlFor="team_name">
          Team name
        </label>
        <input id="team_name" name="team_name" className="cc-input" required value={values.team_name} onChange={(e) => setValues((v) => ({ ...v, team_name: e.target.value }))} />
        {errors.team_name ? <p className="cc-error mt-1">{errors.team_name}</p> : null}
      </div>
      <div>
        <label className="cc-label" htmlFor="captain_discord">
          Captain Discord
        </label>
        <input id="captain_discord" name="captain_discord" className="cc-input" required placeholder="@captain or <@123456789012345678>" autoComplete="off" value={values.captain_discord} onChange={(e) => setValues((v) => ({ ...v, captain_discord: e.target.value }))} />
        {errors.captain_discord ? <p className="cc-error mt-1">{errors.captain_discord}</p> : null}
      </div>
      <div>
        <label className="cc-label" htmlFor="teammates_discord">
          Teammates Discord <span className="text-cc-text/60">(optional)</span>
        </label>
        <textarea id="teammates_discord" name="teammates_discord" rows={4} className="cc-input font-mono text-sm" placeholder={"@player1\n@player2\n<@123456789012345678>"} value={values.teammates_discord} onChange={(e) => setValues((v) => ({ ...v, teammates_discord: e.target.value }))} />
        {errors.teammates_discord ? <p className="cc-error mt-1">{errors.teammates_discord}</p> : null}
      </div>
      <div>
        <label className="cc-label" htmlFor="contact_email">
          Contact email <span className="text-cc-text/60">(optional)</span>
        </label>
        <input id="contact_email" name="contact_email" type="email" className="cc-input" autoComplete="email" value={values.contact_email} onChange={(e) => setValues((v) => ({ ...v, contact_email: e.target.value }))} />
        {errors.contact_email ? <p className="cc-error mt-1">{errors.contact_email}</p> : null}
      </div>
      <div>
        <label className="cc-label" htmlFor="notes">
          Notes <span className="text-cc-text/60">(optional)</span>
        </label>
        <textarea id="notes" name="notes" rows={4} className="cc-input" value={values.notes} onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))} />
        {errors.notes ? <p className="cc-error mt-1">{errors.notes}</p> : null}
      </div>
      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden opacity-0">
        <label htmlFor="company_url">Company URL</label>
        <input id="company_url" name="company_url" type="text" tabIndex={-1} autoComplete="off" value={values.company_url} onChange={(e) => setValues((v) => ({ ...v, company_url: e.target.value }))} />
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button type="submit" className="cc-btn-primary" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit registration"}
        </button>
      </div>
    </form>
  );
}
