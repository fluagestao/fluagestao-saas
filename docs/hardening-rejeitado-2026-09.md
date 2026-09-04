# Hardening de segurança: por que os dois arquivos foram apagados

**Data:** 4 de setembro de 2026
**Arquivos removidos:**

- `supabase/migrations/20260903000000_multi_tenant_security_hardening.sql`
- `supabase/migrations/20260903010000_hardening_cozinha_simulador.sql`
- `docs/security-rollback-2026-09-02.sql`

Estão no histórico do git, se alguém precisar consultá-los.

## Por que apagar em vez de deixar com um aviso

`supabase/migrations/` é uma **fila de coisas a aplicar**. Um arquivo que nunca
deve ser aplicado, morando ali com um comentário "não rode", é uma armadilha:
a pasta diz uma coisa e o comentário diz outra, e quem chegar depois — ou uma
CLI que resolva aplicar o que está pendente — vai acreditar na pasta.

## O que elas queriam fazer

**A primeira (`20260903000000`)**, sobre multi-tenant em geral:

- fazer views em schemas expostos respeitarem o RLS de quem consulta
  (`security_invoker`)
- trocar policies criadas `TO public` por `TO authenticated` — o predicado já
  negava anônimo, então era defesa em profundidade, não correção de brecha
- restringir tipos de arquivo aceitos no bucket de imagens
- índice único em `clientes(email)`

**A segunda (`20260903010000`)**, sobre Cozinha e Simulador: as quatro tabelas
dessas telas nasceram depois da primeira migration e ficaram `TO public`
enquanto o resto passou a `TO authenticated`. Padronizar.

## Por que foram rejeitadas

Uma refutação com seis agentes, em 3 de setembro, levantou 40 riscos e 12
classificados como "quebra". Três motivos, cada um suficiente sozinho:

**1. Referenciam objetos que não existem.** `public.etiquetas`,
`fornecedores.email` e uma policy sobre `assign_product_sequential_code()`.
Cada migration é um único `begin/commit`, então a primeira falha aborta tudo —
e a falha vem no meio, não no começo.

**2. O rollback tem o mesmo defeito.** O
`docs/security-rollback-2026-09-02.sql`, que deveria desfazer, também
referencia objetos inexistentes. Aplicar sem volta é pior que não aplicar.

**3. Duas mudanças quebrariam uso real:**

- A restrição do bucket **rejeitaria HEIC** — o formato padrão das fotos de
  iPhone. A cesteira tira a foto no celular e o upload falha, sem caminho de
  volta.
- O índice único em `clientes(email)` **recusaria duas pessoas da mesma família
  com o mesmo e-mail**, e a mensagem de erro culparia o WhatsApp, porque é ela
  que o código mostra para conflito em `clientes`.

## O que já está coberto sem elas

- RLS habilitada em 14 migrations, e todo acesso de servidor passa por
  `requireCompany()` — inclusive `admin.ts`, `insumos.ts` e `estoque.ts`, que
  furavam a trava do teste vencido até 4 de setembro (commit `18429fc`).
- Nenhuma chave `service_role` em `src/` — verificado por grep no repo inteiro.
- Cabeçalhos de segurança ligados de verdade em `next.config.ts`: HSTS com
  preload, X-Frame-Options, nosniff.
- Recuperar senha e cadastro não revelam se um e-mail existe.
- `/auth/callback` sem open redirect.

## Se alguém quiser retomar

Não reaplique os arquivos. Reescreva em **blocos pequenos, aplicáveis e
reversíveis um a um**, e nesta ordem de valor:

1. `TO authenticated` nas policies que ainda estão `TO public` — inclusive as
   quatro de Cozinha e Simulador. É a parte útil e de menor risco.
2. `security_invoker` nas views expostas — conferindo antes se alguma já nasce
   com ele (`insumo_estoque` já tem).
3. Restrição do bucket **incluindo HEIC e HEIF** na lista permitida.
4. O índice único em `clientes(email)`: **não faça**. E-mail repetido entre
   familiares é caso real neste ramo.

Antes de cada bloco, confirme que os objetos citados existem:

```sql
select table_name from information_schema.tables
 where table_schema = 'public' order by 1;

select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'fornecedores' order by 1;
```
