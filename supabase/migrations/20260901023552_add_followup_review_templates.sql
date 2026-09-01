create table if not exists public.followup_review_templates (
  company_id uuid primary key references public.companies(id) on delete cascade,
  presente text not null,
  consumo_proprio text not null,
  updated_at timestamptz not null default now(),
  constraint followup_review_templates_presente_length
    check (char_length(presente) between 1 and 2000),
  constraint followup_review_templates_consumo_length
    check (char_length(consumo_proprio) between 1 and 2000)
);

alter table public.followup_review_templates enable row level security;

revoke all on table public.followup_review_templates from anon, authenticated;
grant select, insert, update on table public.followup_review_templates to authenticated;

create policy "company members can read followup templates"
  on public.followup_review_templates
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.company_members member
      where member.company_id = followup_review_templates.company_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
    )
  );

create policy "company members can insert followup templates"
  on public.followup_review_templates
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.company_members member
      where member.company_id = followup_review_templates.company_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
    )
  );

create policy "company members can update followup templates"
  on public.followup_review_templates
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.company_members member
      where member.company_id = followup_review_templates.company_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
    )
  )
  with check (
    exists (
      select 1
      from public.company_members member
      where member.company_id = followup_review_templates.company_id
        and member.user_id = (select auth.uid())
        and member.status = 'active'
    )
  );

comment on table public.followup_review_templates is
  'Modelos de mensagens de avaliação personalizados por empresa.';
