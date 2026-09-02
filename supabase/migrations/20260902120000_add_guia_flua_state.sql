alter table public.companies
  add column if not exists guide_enabled boolean,
  add column if not exists guide_completed_steps text[] not null default '{}',
  add column if not exists guide_skipped_steps text[] not null default '{}';

update public.companies
set guide_enabled = (onboarding_completed_at is null)
where guide_enabled is null;

alter table public.companies
  alter column guide_enabled set default true,
  alter column guide_enabled set not null;

comment on column public.companies.guide_enabled is
  'Controla se o Guia do Flua está ativo para a empresa.';
comment on column public.companies.guide_completed_steps is
  'Etapas educativas do Guia do Flua marcadas como concluídas.';
comment on column public.companies.guide_skipped_steps is
  'Etapas educativas do Guia do Flua puladas pelo usuário.';
