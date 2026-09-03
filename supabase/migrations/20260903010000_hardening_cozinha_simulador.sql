-- Estende o hardening multiempresa (20260903000000) as tabelas de Cozinha e
-- Simulador.
--
-- Aquela migration lista tabela por tabela e foi escrita antes destas quatro
-- existirem, entao elas ficaram TO public enquanto o resto do sistema passou a
-- TO authenticated. O predicado has_company_permission ja nega o anonimo, mas
-- deixar quatro tabelas fora do padrao e o tipo de diferenca que ninguem
-- lembra de conferir depois.
--
-- Rodar depois da 20260903000000. Se aquela ainda nao foi aplicada, esta aqui
-- funciona do mesmo jeito: `alter policy ... to` independe dela.

alter policy receitas_select on public.receitas to authenticated;
alter policy receitas_insert on public.receitas to authenticated;
alter policy receitas_update on public.receitas to authenticated;
alter policy receitas_delete on public.receitas to authenticated;

alter policy receita_ingredientes_select on public.receita_ingredientes to authenticated;
alter policy receita_ingredientes_insert on public.receita_ingredientes to authenticated;
alter policy receita_ingredientes_update on public.receita_ingredientes to authenticated;
alter policy receita_ingredientes_delete on public.receita_ingredientes to authenticated;

alter policy simulacoes_select on public.simulacoes to authenticated;
alter policy simulacoes_insert on public.simulacoes to authenticated;
alter policy simulacoes_update on public.simulacoes to authenticated;
alter policy simulacoes_delete on public.simulacoes to authenticated;

alter policy simulacao_itens_select on public.simulacao_itens to authenticated;
alter policy simulacao_itens_insert on public.simulacao_itens to authenticated;
alter policy simulacao_itens_update on public.simulacao_itens to authenticated;
alter policy simulacao_itens_delete on public.simulacao_itens to authenticated;
