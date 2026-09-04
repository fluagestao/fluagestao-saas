# Duas pendências de segurança para pegar depois

**Anotado em:** 4 de setembro de 2026
**Contexto:** o Flua entrou no ar nesta semana com cadastro público e teste
gratuito de 30 dias. Estas duas não impedem o lançamento e não são urgentes —
por isso ficaram anotadas em vez de feitas às pressas.

Nenhuma delas exige conhecer o que foi discutido antes; este documento tem o
necessário.

---

## 1. CSP está em Report-Only e ninguém coleta os relatórios

**Onde:** `next.config.ts`, no bloco de `headers()`.

**O que é.** Content-Security-Policy é a regra que diz ao navegador de onde a
página pode carregar script, estilo e imagem. Em modo **Report-Only** ela
apenas *observa*: nada é bloqueado, e o navegador manda um relatório do que
teria sido barrado.

**O problema.** O modo de observação existe para você ver o que quebraria antes
de ligar de verdade. Mas não há `report-uri` nem `report-to` configurado —
então os relatórios não vão a lugar nenhum. A política está em modo de teste há
tempo, sem que ninguém colha o resultado do teste. Ela não protege e não
informa.

**Duas saídas, e as duas são melhores que ficar como está:**

- **Ligar de verdade.** Trocar `Content-Security-Policy-Report-Only` por
  `Content-Security-Policy`. Antes disso, navegue por todas as telas com o
  console aberto e veja o que a política acusaria — o painel usa Recharts,
  fontes do Google e o Supabase, e todos precisam estar liberados.
- **Ou remover.** Uma política que nem bloqueia nem reporta é ruído no código e
  dá uma falsa sensação de proteção em auditoria.

**O que já protege hoje, e é o que importa mais:** HSTS com preload e dois
anos, `X-Frame-Options`, `X-Content-Type-Options: nosniff` — todos ligados de
verdade no mesmo arquivo. A CSP é camada extra, não a base.

---

## 2. O CAPTCHA é calculado e jogado fora

**Onde:** `src/lib/auth-limite.ts` (a função `contarTentativa`) e as três telas
de autenticação — login, cadastro e recuperar senha.

**O que existe hoje.** Depois de N tentativas falhas, `contarTentativa` devolve
`exigirCaptcha: true`. As três telas recebem esse sinal e **não fazem nada com
ele**. Não há widget de CAPTCHA em lugar nenhum do projeto — o campo é
calculado, devolvido e descartado.

**O que falta:**

1. Criar um site no **Cloudflare Turnstile** (é gratuito) e pegar a chave
   pública e a secreta.
2. Guardar a pública em `NEXT_PUBLIC_TURNSTILE_SITE_KEY` e a secreta em
   `TURNSTILE_SECRET_KEY`. **A secreta nunca vai para o cliente** — só o
   servidor a usa para validar o token.
3. Renderizar o widget nas três telas quando `exigirCaptcha` vier `true`.
4. Validar o token no servidor, dentro da própria server action, antes de
   tentar autenticar. Validar só no navegador não vale nada.

**Por que não é urgente.** O bloqueio por tentativas já existe e funciona: quem
erra demais é barrado por um tempo. O CAPTCHA endurece contra quem espera o
bloqueio passar e tenta de novo, em escala. É defesa a mais, não a única.

**Uma coisa a não esquecer** ao implementar: o fluxo de recuperar senha nunca
pode revelar se um e-mail está cadastrado. A resposta é sempre a mesma frase,
exista a conta ou não. Isso já está correto hoje em `auth-acoes.ts` — não
quebre ao mexer.
