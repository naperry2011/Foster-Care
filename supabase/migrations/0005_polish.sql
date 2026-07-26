-- Milestone 5, Slice A: app shell support + three real bugs.
--
-- 1. Waking a contact used to NULL their wake_up_on, which made the board
--    render "no wake-up date!" for every woken contact — the alarm state,
--    shown in the exact place the product's promise lives. The date is now
--    kept and a separate timestamp records that the task already fired.
-- 2. Tasks had no idempotency key, so any recurring task the cron creates
--    would pile up. Same lesson as send_log's dedupe_key.
-- 3. Recruiter quick-add inserted contact + stage_change directly from the
--    app, the one write path that skipped the database's own guarantees.

alter table contact add column wake_up_fired_at timestamptz;

alter table task add column dedupe_key text;
create unique index task_dedupe on task (agency_id, dedupe_key)
  where dedupe_key is not null;

-- Agencies could never be renamed: `agency` shipped with a SELECT policy and
-- nothing else, so the settings page would have failed silently under RLS.
create policy agency_update on agency for update
  to authenticated
  using (id = current_agency_id())
  with check (id = current_agency_id());

-- ---------------------------------------------------------------------------
-- set_contact_stage v3 — same signature, so this replaces 0003's definition.
-- Leaving not_yet now also clears wake_up_fired_at, so a contact who comes
-- back around later gets a fresh clock instead of a spent one.

create or replace function set_contact_stage(
  p_contact_id uuid,
  p_to_stage contact_stage,
  p_reason text default null,
  p_wake_up_on date default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_from contact_stage;
  v_agency uuid;
begin
  select stage, agency_id into v_from, v_agency
    from contact where id = p_contact_id for update;
  if not found then
    raise exception 'contact not found';
  end if;
  if v_agency is distinct from (select agency_id from app_user where id = auth.uid()) then
    raise exception 'not authorized';
  end if;
  if v_from = p_to_stage then
    return;
  end if;

  perform set_config('porchlight.stage_change_ok', 'on', true);
  update contact set
    stage = p_to_stage,
    wake_up_on = case
      when p_to_stage = 'not_yet'
        then coalesce(p_wake_up_on, wake_up_on, (current_date + interval '1 year')::date)
      else null
    end,
    wake_up_fired_at = case when p_to_stage = 'not_yet' then wake_up_fired_at else null end
    where id = p_contact_id;
  perform set_config('porchlight.stage_change_ok', 'off', true);

  insert into stage_change (agency_id, contact_id, from_stage, to_stage, actor_user_id, reason)
    values (v_agency, p_contact_id, v_from, p_to_stage, auth.uid(), p_reason);
end $$;

revoke all on function set_contact_stage(uuid, contact_stage, text, date) from public, anon;
grant execute on function set_contact_stage(uuid, contact_stage, text, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Recruiter quick-add, standing at a table. One transaction, and the
-- stage_change row can no longer be forgotten by a caller.

create or replace function quick_add_contact(
  p_source_id uuid,
  p_phone text default null,
  p_email text default null,
  p_first_name text default null,
  p_last_name text default null,
  p_consent_email boolean default false,
  p_consent_sms boolean default false,
  p_notes text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_agency uuid;
  v_caller_agency uuid;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authorized';
  end if;
  select agency_id into v_caller_agency from app_user where id = auth.uid();
  if v_caller_agency is null then
    raise exception 'not authorized';
  end if;

  select agency_id into v_agency from source where id = p_source_id;
  if not found then
    raise exception 'source not found';
  end if;
  if v_agency is distinct from v_caller_agency then
    raise exception 'not authorized';
  end if;

  if nullif(trim(coalesce(p_phone, '')), '') is null
     and nullif(trim(coalesce(p_email, '')), '') is null then
    raise exception 'phone or email required';
  end if;

  insert into contact (agency_id, source_id, captured_by_user_id, phone, email,
                       first_name, last_name, consent_email, consent_sms, notes, stage)
    values (v_agency, p_source_id, auth.uid(),
            nullif(trim(coalesce(p_phone, '')), ''),
            nullif(trim(coalesce(p_email, '')), ''),
            nullif(trim(coalesce(p_first_name, '')), ''),
            nullif(trim(coalesce(p_last_name, '')), ''),
            coalesce(p_consent_email, false), coalesce(p_consent_sms, false),
            nullif(trim(coalesce(p_notes, '')), ''), 'curious')
    returning id into v_id;

  insert into stage_change (agency_id, contact_id, from_stage, to_stage, actor_user_id, reason)
    values (v_agency, v_id, null, 'curious', auth.uid(), 'recruiter quick-add');

  return v_id;
end $$;

-- Supabase's default privileges grant EXECUTE on every new public-schema
-- function to anon, and `revoke from public` does not undo it. See 0004.
revoke all on function quick_add_contact(uuid, text, text, text, text, boolean, boolean, text) from public, anon;
grant execute on function quick_add_contact(uuid, text, text, text, text, boolean, boolean, text) to authenticated;
