alter table public.produtos
  add column if not exists rascunho boolean not null default false;

create index if not exists produtos_company_rascunho_idx
  on public.produtos (company_id, rascunho);
