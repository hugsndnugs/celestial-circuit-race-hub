alter table relay_events
  add column if not exists effective_recorded_at timestamptz;

update relay_events
set effective_recorded_at = recorded_at
where effective_recorded_at is null;

alter table relay_events
  alter column effective_recorded_at set not null;

create table if not exists correction_requests (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references races(id) on delete cascade,
  supersedes_event_id uuid not null references relay_events(id) on delete restrict,
  requested_by text not null,
  reason text not null,
  status text not null check (status in ('pending', 'approved', 'rejected', 'applied', 'failed')),
  submitted_at timestamptz not null default now(),
  effective_recorded_at timestamptz not null,
  reviewed_by text null,
  reviewed_at timestamptz null,
  review_notes text null,
  applied_event_id uuid null references relay_events(id) on delete restrict,
  idempotency_key text not null unique
);

create unique index if not exists uniq_correction_request_active_source
  on correction_requests (supersedes_event_id)
  where status in ('pending', 'approved', 'applied');

create table if not exists notification_outbox (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references races(id) on delete cascade,
  correction_request_id uuid null references correction_requests(id) on delete cascade,
  topic text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null check (status in ('pending', 'sent', 'failed')) default 'pending',
  attempts integer not null default 0,
  last_error text null,
  sent_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists audit_entries (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references races(id) on delete cascade,
  correction_request_id uuid null references correction_requests(id) on delete cascade,
  actor text not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table correction_requests enable row level security;
alter table notification_outbox enable row level security;
alter table audit_entries enable row level security;

drop policy if exists correction_requests_select on correction_requests;
create policy correction_requests_select on correction_requests
for select
to anon
using (true);

drop policy if exists notification_outbox_select on notification_outbox;
create policy notification_outbox_select on notification_outbox
for select
to anon
using (true);

drop policy if exists audit_entries_select on audit_entries;
create policy audit_entries_select on audit_entries
for select
to anon
using (true);

drop policy if exists relay_events_insert on relay_events;
create policy relay_events_insert on relay_events
for insert
to anon
with check (
  source = 'marshal_tap'
  and recorded_by like 'marshal:%'
  and supersedes_event_id is null
  and correction_reason is null
  and invalidated_by_event_id is null
  and effective_recorded_at = recorded_at
);

drop policy if exists relay_events_update on relay_events;

