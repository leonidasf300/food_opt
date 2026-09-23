-- body_profiles started as one row per user (latest snapshot only). Turn it into a
-- history table -- each save is a new measurement, so weight/waist/etc. can be
-- charted over time (see especificaciones/01-specify.md module 4). Existing rows
-- become the first historical entry for whoever already had one.

alter table public.body_profiles drop constraint body_profiles_pkey;
alter table public.body_profiles add column id uuid not null default gen_random_uuid();
alter table public.body_profiles add constraint body_profiles_pkey primary key (id);
alter table public.body_profiles rename column updated_at to measured_at;

create index body_profiles_user_id_measured_at_idx on public.body_profiles (user_id, measured_at desc);
