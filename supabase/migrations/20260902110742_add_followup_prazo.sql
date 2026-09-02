-- Prazo do follow-up: quantos dias depois da entrega pedir a avaliação.
--
-- Vai na tabela que já existe em vez de uma nova: ela já é uma linha por
-- empresa e já tem as quatro políticas de RLS. Tabela nova significaria
-- duplicar tudo isso por causa de um número.

alter table public.followup_review_templates
  add column if not exists dias_para_avaliacao smallint not null default 3
  check (dias_para_avaliacao between 0 and 60);

comment on table public.followup_review_templates is
  'Modelos de mensagem e prazo de follow-up, por empresa.';
