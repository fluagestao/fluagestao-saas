alter table public.companies
  add column if not exists onboarding_completed_at timestamptz;

update public.companies
set onboarding_completed_at = coalesce(onboarding_completed_at, created_at, now())
where onboarding_completed_at is null;

comment on column public.companies.onboarding_completed_at is
  'Momento em que o proprietário concluiu o onboarding inicial. Contas novas ficam nulas até a primeira configuração.';
