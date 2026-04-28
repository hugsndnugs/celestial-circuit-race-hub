# Contributing to Docs

## Objective

Keep this docs repository aligned with live behavior across all `celestial-circuit-race-*` projects.

## Contribution Rules

1. Every operational or configuration change in source repos should include docs updates.
2. Validate facts against source `README`, `docs`, workflow, and env template files.
3. Favor concise, task-oriented guidance over narrative prose.

## Suggested Change Workflow

1. Identify impacted docs section(s).
2. Update canonical `docs/*.md` content first.
3. Update corresponding route summary pages in `app/*`.
4. Update `README.md` if setup/maintenance expectations change.
5. Run `npm run lint` and `npm run build`.
6. Verify route links and section discoverability from docs home.

## Review Checklist

- Environment variables and secret names are exact.
- Workflow file names and deployment behavior match source repos.
- SQL snippets are safe and clearly scoped.
- Incident/runbook steps are unambiguous and actionable.
