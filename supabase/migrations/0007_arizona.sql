-- Milestone 5, Slice E: Arizona's public numbers, and an agency's own goals.
--
-- Two kinds of number appear on /arizona and they must never be confusable:
--
--   az_stat       published by somebody else. Has a source row, always.
--                 No write policy at all — service_role (the import script)
--                 is the only thing that can put a number here.
--   agency_target typed by a recruitment director. Agency-scoped RLS like
--                 every other tenant table, and rendered in the handwritten
--                 treatment so it can never be read as a state statistic.
--
-- Physically separate tables rather than one table with an is_official flag:
-- a boolean can be got wrong by one bad insert, a missing write policy cannot.
-- See ADR-011.
--
-- Grain matters as much as value. Arizona publishes entries into care by
-- county, but children currently in care only statewide, and licensed homes
-- only statewide. az_metric.published_levels is what lets the page *say* that
-- out loud instead of rendering an empty cell. See docs/az-data-sources.md.

create type az_geo_level as enum ('state','region','county');
create type az_source_kind as enum ('dcs_dataset','dcs_page','news','legislation');

-- Every place a number can be about. Everything FKs to this, so a typo in a
-- county name fails the insert instead of quietly orphaning a statistic.
create table az_geo (
  id text primary key,                       -- 'az', 'az-maricopa'
  level az_geo_level not null,
  name text not null,
  parent_id text references az_geo (id),
  fips text,
  -- lets a dependant table demand a particular level (see agency_county)
  unique (id, level)
);

create table az_metric (
  id text primary key,
  label text not null,
  unit text not null,                        -- children | homes | beds | fraction
  -- the grains Arizona actually publishes this at. The page reads this to
  -- explain an absence rather than show a blank.
  published_levels az_geo_level[] not null,
  ars_item text,                             -- A.R.S. § 8-526 item number
  unpublished_note text,                     -- plain English, shown to the user
  sort_order integer not null default 100
);

create table az_stat_source (
  id text primary key,
  publisher text not null,
  title text not null,
  url text not null,
  source_kind az_source_kind not null,
  -- null is meaningful: DCS's recruitment pages carry no publication date and
  -- the UI must say "undated" rather than imply freshness.
  published_on date
);

create table az_stat (
  id uuid primary key default gen_random_uuid(),
  metric_id text not null references az_metric (id),
  geo_id text not null references az_geo (id),
  source_id text not null references az_stat_source (id),
  -- null only when the source itself is undated
  as_of date,
  period_label text not null,                -- 'as of Dec 31, 2025', 'SFY26 to date'
  value numeric not null,
  is_projection boolean not null default false,
  note text,
  imported_at timestamptz not null default now(),
  unique (metric_id, geo_id, period_label)
);

create index on az_stat (metric_id, geo_id);
create index on az_geo (level);

-- ============ agency-owned rows ============

create table agency_target (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references agency (id),
  label text not null,
  target_value numeric not null,
  unit text not null default 'homes',
  due_on date,
  note text,
  created_at timestamptz not null default now(),
  created_by_user_id uuid references app_user (id)
);

create index on agency_target (agency_id);

-- Which counties an agency actually recruits in. geo_level is pinned to
-- 'county' by a check and carried into the foreign key, so an agency cannot
-- claim to serve "Arizona" or a region that does not exist.
create table agency_county (
  agency_id uuid not null references agency (id),
  geo_id text not null,
  geo_level az_geo_level not null default 'county' check (geo_level = 'county'),
  primary key (agency_id, geo_id),
  foreign key (geo_id, geo_level) references az_geo (id, level)
);

-- ============ RLS ============

alter table az_geo enable row level security;
alter table az_metric enable row level security;
alter table az_stat_source enable row level security;
alter table az_stat enable row level security;
alter table agency_target enable row level security;
alter table agency_county enable row level security;

-- Public reference data: readable by any signed-in user, writable by nobody.
-- There is deliberately no insert/update/delete policy on these four tables,
-- so the only way a number reaches the page is scripts/az-stats-import.mjs
-- running with the service-role key. A compromised browser session cannot
-- rewrite what the state of Arizona said.
create policy az_geo_read on az_geo for select to authenticated using (true);
create policy az_metric_read on az_metric for select to authenticated using (true);
create policy az_stat_source_read on az_stat_source for select to authenticated using (true);
create policy az_stat_read on az_stat for select to authenticated using (true);

create policy agency_target_rw on agency_target for all
  using (agency_id = current_agency_id())
  with check (agency_id = current_agency_id());

create policy agency_county_rw on agency_county for all
  using (agency_id = current_agency_id())
  with check (agency_id = current_agency_id());

-- No new functions in this migration, so there is nothing to revoke from
-- anon. If you add one, revoke it by name — see ADR-007's follow-up.

-- ============ geography ============

insert into az_geo (id, level, name, parent_id, fips) values
  ('az', 'state', 'Arizona', null, '04');

insert into az_geo (id, level, name, parent_id, fips) values
  ('az-apache',     'county', 'Apache',     'az', '04001'),
  ('az-cochise',    'county', 'Cochise',    'az', '04003'),
  ('az-coconino',   'county', 'Coconino',   'az', '04005'),
  ('az-gila',       'county', 'Gila',       'az', '04007'),
  ('az-graham',     'county', 'Graham',     'az', '04009'),
  ('az-greenlee',   'county', 'Greenlee',   'az', '04011'),
  ('az-la-paz',     'county', 'La Paz',     'az', '04012'),
  ('az-maricopa',   'county', 'Maricopa',   'az', '04013'),
  ('az-mohave',     'county', 'Mohave',     'az', '04015'),
  ('az-navajo',     'county', 'Navajo',     'az', '04017'),
  ('az-pima',       'county', 'Pima',       'az', '04019'),
  ('az-pinal',      'county', 'Pinal',      'az', '04021'),
  ('az-santa-cruz', 'county', 'Santa Cruz', 'az', '04023'),
  ('az-yavapai',    'county', 'Yavapai',    'az', '04025'),
  ('az-yuma',       'county', 'Yuma',       'az', '04027');

-- No region rows. DCS's own reports contain no regional breakdown of any
-- metric we care about, so seeding regions would invent a grain the state
-- does not publish. The enum keeps the level available if that ever changes.

-- ============ metrics ============

insert into az_metric (id, label, unit, published_levels, ars_item, unpublished_note, sort_order) values
  ('children_entering_care', 'Children entering out-of-home care', 'children',
   '{state,county}', '12, 14 & 15', null, 10),

  ('children_in_care', 'Children in out-of-home care', 'children',
   '{state}', '20',
   'Arizona publishes this statewide only. County figures exist for children entering care during a period, but not for how many children are in care today.', 20),

  ('licensed_foster_homes', 'Licensed foster homes', 'homes',
   '{state}', '17',
   'No DCS report breaks licensed homes down by county or region. Statewide is the only grain that exists.', 30),

  ('licensed_kinship_homes', 'Licensed kinship foster homes', 'homes',
   '{state}', '17', null, 31),

  ('licensed_community_homes', 'Licensed community foster homes', 'homes',
   '{state}', '17', null, 32),

  ('unlicensed_kinship_homes', 'Unlicensed kinship homes', 'homes',
   '{state}', '17', null, 33),

  ('licensed_foster_beds', 'Licensed foster care beds', 'beds',
   '{state}', null, null, 34),

  -- Ingested for completeness, deliberately not shown: the series drops 841 to
  -- 73 between SFY22 and SFY23 while total homes decline smoothly, which reads
  -- as a change in how the Department counts rather than an event in the world.
  ('new_licenses_issued', 'New foster licenses issued', 'homes',
   '{state}', null, null, 90),

  ('children_in_congregate_care', 'Children in congregate care', 'children',
   '{state}', '22', null, 40),

  ('pct_days_congregate_care', 'Share of care days spent in congregate care', 'fraction',
   '{state}', null, null, 41),

  ('pct_days_congregate_care_goal', 'DCS goal: reduction in congregate care days', 'fraction',
   '{state}', null, null, 42),

  ('homes_needed', 'Additional foster homes Arizona needs', 'homes',
   '{state}', null, null, 1),

  ('licensed_homes_change', 'Change in licensed foster homes', 'fraction',
   '{state}', null, null, 2),

  ('children_needing_families', 'Children needing a foster or adoptive family', 'children',
   '{state}', null, null, 3),

  ('foster_rate_increase', 'Increase in daily foster reimbursement', 'fraction',
   '{state}', null, null, 50);

-- ============ sources ============

insert into az_stat_source (id, publisher, title, url, source_kind, published_on) values
  ('dcs-semiannual-2026-03', 'Arizona DCS',
   'Semi-Annual Child Welfare Report, March 2026',
   'https://dcs.az.gov/content/semi-annual-child-welfare-report-mar-2026',
   'dcs_dataset', null),

  ('dcs-monthly-2026-06', 'Arizona DCS',
   'Monthly Operational & Outcomes Report, June 2026',
   'https://dcs.az.gov/content/monthly-operational-outcomes-report-june-2026',
   'dcs_dataset', null),

  ('kjzz-2025-12-05', 'Governor''s Office via KJZZ',
   'Arizona just raised foster care pay rates by 50%. State still needs 1,046 more homes',
   'https://www.kjzz.org/politics/2025-12-05/arizona-just-raised-foster-care-pay-rates-by-50-state-still-needs-1-046-more-homes',
   'news', '2025-12-05'),

  ('dcs-rates-2025-12', 'Arizona DCS',
   'Foster Care Rates increasing December 1st for children aged 6 and up',
   'https://dcs.az.gov/news/great-news-foster-care-rates-increasing-december-1st-children-aged-6-and',
   'dcs_page', '2025-12-01'),

  -- The undated one. DCS states "over 7,000 children" on a page that carries no
  -- publication date at all, so as_of stays null and the UI says so.
  ('dcs-learnmore', 'Arizona DCS',
   'Foster Care and Adoption — Learn More',
   'https://dcs.az.gov/foster/learnmore',
   'dcs_page', null),

  ('dcs-strategic-fy26', 'Arizona DCS',
   'AZDCS 2025–2029 Strategic Plan (FY26)',
   'https://dcs.az.gov/sites/default/files/DCS-Reports/AZDCS-strategicplan-fy26.pdf',
   'dcs_page', null);

-- ============ statewide figures ============
-- Seeded here so /arizona has something true to show on a fresh database,
-- before anyone runs the import script. Every value below was read out of the
-- workbooks named in docs/az-data-sources.md, or off the cited page.

insert into az_stat (metric_id, geo_id, source_id, as_of, period_label, value, note) values
  -- The Governor's office, reported by KJZZ. Not a DCS dataset — hence
  -- az_stat_source.source_kind.
  ('homes_needed', 'az', 'kjzz-2025-12-05', '2025-12-05', 'next 12 months', 1046,
   'The state''s own estimate of the gap, given when the reimbursement increase was announced.'),

  ('licensed_homes_change', 'az', 'kjzz-2025-12-05', '2025-12-05', '2017 to 2025', -0.62,
   'Independently confirmed by the Monthly Operational Report: 4,875 licensed homes in SFY17 against 1,859 in SFY25 is a 61.9% decline.'),

  ('children_needing_families', 'az', 'dcs-learnmore', null, 'undated', 7000,
   'DCS states "over 7,000". The page carries no publication date, so this figure has no as-of and should not be quoted as current.'),

  ('foster_rate_increase', 'az', 'dcs-rates-2025-12', '2025-12-01', 'effective Dec 1, 2025', 0.50,
   'Daily room-and-board rate, children aged 6 to 18. Roughly $1,000–$1,700 more per child per month.'),

  -- Semi-Annual report, the statutory A.R.S. § 8-526 counts.
  ('children_in_care', 'az', 'dcs-semiannual-2026-03', '2025-12-31', 'as of Dec 31, 2025', 8183, null),
  ('licensed_foster_homes', 'az', 'dcs-semiannual-2026-03', '2025-12-31', 'as of Dec 31, 2025', 1719, null),
  ('licensed_kinship_homes', 'az', 'dcs-semiannual-2026-03', '2025-12-31', 'as of Dec 31, 2025', 222, null),
  ('licensed_community_homes', 'az', 'dcs-semiannual-2026-03', '2025-12-31', 'as of Dec 31, 2025', 1497,
   '3,767 bed spaces.'),
  ('unlicensed_kinship_homes', 'az', 'dcs-semiannual-2026-03', '2025-12-31', 'as of Dec 31, 2025', 2193,
   'Relatives caring for children without a foster licence. Not a recruitment pipeline, but the reason the licensed count understates who is caring.'),
  ('children_in_congregate_care', 'az', 'dcs-semiannual-2026-03', '2025-12-31', 'as of Dec 31, 2025', 808, null),

  -- Monthly Operational Report, by state fiscal year.
  ('licensed_foster_homes', 'az', 'dcs-monthly-2026-06', '2017-06-30', 'SFY17', 4875, null),
  ('licensed_foster_homes', 'az', 'dcs-monthly-2026-06', '2025-06-30', 'SFY25', 1859, null),
  ('licensed_foster_homes', 'az', 'dcs-monthly-2026-06', '2026-06-30', 'SFY26 to date', 1628,
   'Fiscal year to date, not a final-year figure.'),
  ('licensed_foster_beds', 'az', 'dcs-monthly-2026-06', '2017-06-30', 'SFY17', 11046, null),
  ('licensed_foster_beds', 'az', 'dcs-monthly-2026-06', '2026-06-30', 'SFY26 to date', 3585,
   'Fiscal year to date, not a final-year figure.'),
  ('new_licenses_issued', 'az', 'dcs-monthly-2026-06', '2017-06-30', 'SFY17', 1979, null),
  ('new_licenses_issued', 'az', 'dcs-monthly-2026-06', '2026-06-30', 'SFY26 to date', 29,
   'Not displayed: this series falls from 841 to 73 between SFY22 and SFY23 while total homes decline smoothly, which reads as a counting change rather than an event.'),

  ('pct_days_congregate_care', 'az', 'dcs-monthly-2026-06', '2024-06-30', 'SFY24', 0.1522, null),
  ('pct_days_congregate_care', 'az', 'dcs-monthly-2026-06', '2025-06-30', 'SFY25', 0.1576, null),
  ('pct_days_congregate_care', 'az', 'dcs-monthly-2026-06', '2026-06-30', 'SFY26 to date', 0.1719,
   'Fiscal year to date. Rising, against the Department''s own goal of a two-point reduction by June 2026.'),

  ('pct_days_congregate_care_goal', 'az', 'dcs-strategic-fy26', '2026-06-30', 'FY26 goal', -0.02,
   'Strategic plan goal 5.2: decrease the percentage of care days spent in congregate care by 2% by June 2026.');
