-- Append-only history was blocking erasure entirely: deleting a contact
-- cascades into touch/stage_change, whose triggers reject every DELETE. That
-- made "please delete my information" impossible to honor, and left typo'd
-- contacts permanent.
--
-- History still cannot be quietly rewritten. Deletion is allowed only through
-- delete_contact(), which removes the whole person — the same GUC pattern
-- set_contact_stage() already uses.

-- outcome and referral chains must not block the cascade
alter table outcome drop constraint outcome_contact_id_fkey;
alter table outcome add constraint outcome_contact_id_fkey
  foreign key (contact_id) references contact (id) on delete cascade;

alter table contact drop constraint contact_referred_by_contact_id_fkey;
alter table contact add constraint contact_referred_by_contact_id_fkey
  foreign key (referred_by_contact_id) references contact (id) on delete set null;

create or replace function forbid_mutation() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE'
     and current_setting('porchlight.erasing_contact', true) = 'on' then
    return old;
  end if;
  raise exception '% is append-only', tg_table_name;
end $$;

-- Erase a person entirely: contact + every trace of them (touches, stage
-- history, sends, tasks, outcome). The source and its cost survive, so the
-- attribution ledger's denominators stay honest.
create or replace function delete_contact(p_contact_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_agency uuid;
begin
  select agency_id into v_agency from contact where id = p_contact_id;
  if not found then
    raise exception 'contact not found';
  end if;
  -- signed-in users may only erase their own agency's contacts;
  -- service_role (system jobs, admin scripts) is unrestricted
  if auth.uid() is not null
     and v_agency is distinct from (select agency_id from app_user where id = auth.uid()) then
    raise exception 'not authorized';
  end if;

  perform set_config('porchlight.erasing_contact', 'on', true);
  delete from contact where id = p_contact_id;
  perform set_config('porchlight.erasing_contact', 'off', true);
end $$;

-- deliberately NOT granted to anon
revoke all on function delete_contact from public;
grant execute on function delete_contact to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- The waiting room is a date, not a mood.
--
-- A contact could be moved to not_yet with no wake_up_on at all (the UI asked
-- for the date in a dialog the recruiter could dismiss), which dropped them
-- into the exact graveyard this product exists to prevent. The stage change
-- now carries the date, and the database defaults one when none is given, so
-- nobody sits in the waiting room without a clock.

drop function if exists set_contact_stage(uuid, contact_stage, text);

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
    end
    where id = p_contact_id;
  perform set_config('porchlight.stage_change_ok', 'off', true);

  insert into stage_change (agency_id, contact_id, from_stage, to_stage, actor_user_id, reason)
    values (v_agency, p_contact_id, v_from, p_to_stage, auth.uid(), p_reason);
end $$;

grant execute on function set_contact_stage to authenticated;

-- heal anyone already stranded in the waiting room without a date
update contact set wake_up_on = (current_date + interval '1 year')::date
  where stage = 'not_yet' and wake_up_on is null;
