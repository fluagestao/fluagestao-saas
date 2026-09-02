-- Marca quais categorias são de adicionais.
--
-- Até aqui a classificação era um match de texto no slug
-- (`slug.includes('adicionais')`), então uma categoria chamada "Extras" ou
-- "Complementos" não contava e nada na tela avisava. A flag torna a regra
-- explícita e sobrevive a renomear a categoria.
--
-- Default false e sem NOT NULL nas linhas antigas quebrando: nada muda de
-- comportamento até alguém marcar a caixa. O código mantém, por compatibilidade,
-- o reconhecimento do slug antigo.

alter table public.categorias
  add column if not exists e_adicional boolean not null default false;

comment on column public.categorias.e_adicional is
  'Categoria de adicionais (vendidos junto de uma cesta, ou sozinhos). Alimenta a aba Adicionais e a taxa de anexo do Dashboard.';

-- Adota o que já funcionava pela convenção de nome, para o histórico não mudar
-- de leitura de um dia para o outro.
update public.categorias
   set e_adicional = true
 where e_adicional = false
   and slug like '%adicionais%';
