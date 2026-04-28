# Status Guide

## Purpose

`celestial-circuit-race-status` is the public communication surface for incidents and service health.

## Configuration

- `NEXT_PUBLIC_STATUS_PAGE_TITLE` (optional UI title)
- `NEXT_PUBLIC_STATUS_PUBLIC_URL` (optional canonical status URL)

## Publishing Standards

- Provide concise updates with clear impact statements.
- Include next update ETA for ongoing incidents.
- Post recovery notice and close incident with summary.

## Recommended Update Cadence

- Initial acknowledgement: within minutes of confirmed issue.
- Active updates: every meaningful milestone or fixed interval.
- Resolution update: when service is restored and stable.
- Follow-up note: if postmortem action is needed.

## Integration with Race Operations

- Link from controller and signups operator workflows during incidents.
- Use the same incident terminology as operations runbook severities.
