# Arquitetura

> Decisões técnicas do projeto. Ao mudar uma decisão, atualize este arquivo no mesmo PR e explique o motivo.

## 1. Stack

| Camada | Escolha | Motivo |
|---|---|---|
| Framework | **Next.js 16** (App Router) + **TypeScript** | React e Node no mesmo projeto. É o caso nativo da Vercel. |
| Banco | **PostgreSQL** na **Neon** (local: Docker) | Postgres serverless com integração oficial da Vercel. |
| ORM | **Prisma 7** com `@prisma/adapter-pg` | Schema tipado e migrations versionadas. O Prisma 7 exige driver adapter. |
| Autenticação | **Better Auth** (e-mail + senha) | Sessões no banco, sem autocadastro, convite e reset de senha. |
| UI | **Tailwind CSS 4** + **shadcn/ui** (base **Base UI**) | Componentes acessíveis, fáceis de personalizar com as cores da organização. |
| Formulários | **Server Actions** + `useActionState` + **Zod** | Validação no servidor com os mesmos schemas testados em unidade. |
| Arquivos | **Vercel Blob** (local: `public/uploads`) | Selfies, anexos de ajustes e logos. |
| E-mail | **Resend** (local: console) | Convites, reset de senha e notificações. |
| Testes | **Vitest** (unidade) e **Playwright** (E2E, depois) | O motor de cálculo exige cobertura alta. |
| Mobile | **PWA** responsivo | Instalável no celular sem app nativo. Acesso a câmera e GPS pelo navegador. |
| Fontes | **Geist** via pacote `geist` (local) | Não depende do Google Fonts no build. |
| Deploy | **Vercel** | Preview automático por PR. |

### 1.1 Decisões da Fase 1

- **Cache Components desligado** (`cacheComponents` em `next.config.ts`). Quase todas as telas dependem da
  sessão; com o recurso ligado, cada leitura de cookie precisaria de `<Suspense>` ou opt-out por rota.
  A renderização dinâmica padrão é mais simples. Reavaliar se surgirem páginas públicas pesadas.
- **Sem React Hook Form.** As server actions validam com Zod e devolvem erros por campo (`ActionState`).
  O hook `useServerForm` (`src/components/form.tsx`) envia via `onSubmit` para o React não limpar os
  campos quando a validação falha.
- **Convite = reset de senha.** Ao cadastrar um usuário, gravamos um token no formato do Better Auth
  (`reset-password:<token>`, validade de 7 dias). A tela `/definir-senha` atende o convite e o
  "esqueci a senha" com o mesmo endpoint; o reset cria a conta de credencial quando ela ainda não existe.
- **Perfil e status lidos do banco a cada requisição** (`getCurrentUser`), não do cookie: desativar um
  usuário ou trocar o perfil vale na hora. Desativar também apaga as sessões abertas.
- **`proxy.ts`** (antigo middleware) só faz a checagem otimista do cookie. A autorização de verdade é
  `requireUser` / `requirePermission` no servidor.
- **Identidade visual**: a cor da organização é aplicada em `:root` por um `<style>` no layout autenticado,
  para alcançar também menus e diálogos renderizados em portal. O texto sobre a cor (branco ou escuro)
  é calculado pelo contraste WCAG (`src/lib/color.ts`).
- **Logo só em PNG, JPG ou WebP** (até 1 MB). SVG ficou de fora porque pode conter scripts.

### 1.2 Decisões da Fase 2 (registro de ponto)

- **NSR sem lacunas.** Em vez de uma `SEQUENCE` (que pula números quando uma transação falha), o NSR vem
  da tabela `nsr_counter` (linha única). Cada batida faz `UPDATE ... RETURNING` nessa linha dentro da
  transação: a trava serializa as batidas e o rollback desfaz o incremento.
- **Marcações imutáveis no banco.** Triggers em `time_entries` recusam `UPDATE`, `DELETE` e `TRUNCATE`
  (migration `marcacoes_imutaveis`). A relação com usuário é `onDelete: Restrict`.
- **Hora do servidor.** `punchedAt` é `new Date()` no servidor, gravado como `timestamptz`. "Hoje",
  dia da semana e horário comercial são calculados em `America/Sao_Paulo` (`src/lib/time.ts`).
- **Horário comercial provisório.** Até as jornadas individuais (Fase 3), o aviso de "fora do horário" usa o
  horário comercial da empresa (`businessHoursStart/End`, `businessDays`). O servidor responde
  `needs-confirmation` e o cliente reenvia com a confirmação.
- **Exigências por usuário.** Os campos `punchRequire*` do usuário são `null` (segue a empresa) ou
  `true/false`. A cerca virtual implica geolocalização (`resolveRequirements`).
- **QR code rotativo.** O painel (`/painel-qr?chave=…`, público) mostra um QR com
  `/ponto?qr=<token>`. O token é um HMAC do segredo da empresa sobre janelas de 60 s, e o servidor aceita a
  janela atual e as duas anteriores. A chave do painel também é derivada do segredo; "gerar novo link"
  troca o segredo e invalida o painel. O login preserva o destino em `?next` (validado por `safeNext`).
- **Selfie privada.** Capturada ao vivo com `getUserMedia` (sem galeria), JPEG de até 640 px. Gravada no
  Vercel Blob com `access: "private"` (local: `storage/private`, fora de `public/`). Só é servida por
  `/api/marcacoes/[id]/selfie`, que confere a permissão e responde com `no-store`.
- **Escopo da equipe.** `teamScope` (`src/server/team.ts`): RH e Admin veem todos; o gestor vê os setores
  que gerencia. Fora do escopo, as páginas respondem 404.
- **Formulários com `method="post"`.** Formulários enviados por JavaScript declaram `method="post"`: se
  o usuário enviar antes da hidratação, os campos (inclusive a senha no login) não vão para a URL.

## 2. Convenções

- **Código** (variáveis, funções, tabelas, rotas de API) em **inglês**.
- **Interface, rotas visíveis, documentação, commits e PRs** em **português** (`/usuarios`, `/setores`…).
- Commits no padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/): `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
- Branches: `main` protegida; uma branch por funcionalidade (`feat/…`, `fix/…`, `docs/…`); integração só via PR.
- Toda mudança relevante entra no `CHANGELOG.md`.
- Regras de negócio ficam em `src/server/*` e lançam `DomainError` (mensagem para o usuário + campo).
  As actions convertem com `toActionState`.

## 3. Princípios de domínio

1. **Marcação é imutável.** A tabela de marcações só recebe `INSERT`. Ajustes são registros separados que
   prevalecem sobre a marcação no cálculo.
2. **Hora do servidor.** O horário da batida vem do servidor/banco, nunca do cliente.
   Armazenamento em `timestamptz` (UTC); exibição em `America/Sao_Paulo`.
3. **NSR** gerado por uma `SEQUENCE` do Postgres, dentro da mesma transação da marcação.
4. **Permissões no servidor.** Toda checagem de perfil acontece no servidor (server actions/rotas).
   A interface apenas esconde o que o usuário não pode usar. A matriz fica em `src/lib/permissions.ts`.
5. **Auditoria** em todas as escritas relevantes, gravada na mesma transação da mudança.

## 4. Modelo de dados

Implementado (`prisma/schema.prisma`):

```
Organization       registro único: nome, razão social, CNPJ/CPF, logo, cor principal,
                   validações padrão da batida, horário comercial, segredo do QR
User               nome, e-mail, perfil (ADMIN | HR | MANAGER | EMPLOYEE), setor, ativo,
                   exceções das validações da batida
Department         nome, gestor (User com perfil MANAGER)
AllowedLocation    local permitido da cerca virtual: nome, lat, lng, raio, ativo
TimeEntry          marcação imutável: NSR, usuário, horário, localização, local, selfie, QR,
                   fora do horário, IP, user agent
NsrCounter         contador do NSR (linha única)
AuditLog           autor, ação, entidade, antes/depois, IP, user agent, data
Session, Account, Verification   tabelas do Better Auth
```

Planejado para as próximas fases:

```
WorkSchedule       jornada: tipo (semanal, 12x36, ...), regras por dia
Holiday            data, nome, abrangência (nacional, estadual, municipal)
AdjustmentRequest  tipo, datas/horários, justificativa, anexo, status, etapa, referência à anterior
AdjustmentReview   etapa (gestor | RH), revisor, decisão, comentário, data
Notification       usuário, tipo, conteúdo, lida
```

## 5. Estrutura de pastas

```
prisma/               schema, migrations e seed
src/
  app/
    (auth)/           login, esqueci-senha, definir-senha
    (app)/            telas autenticadas: inicio, ponto, equipe, usuarios, setores, configuracoes, auditoria
    painel-qr/        painel público do QR code (tablet/monitor na empresa)
    api/auth/         endpoint do Better Auth
    api/marcacoes/    selfie das marcações (com checagem de permissão)
  components/
    ui/               componentes do shadcn/ui
    app-shell/        barra lateral, menu do celular e itens de navegação
    brand/            marca Pontual
    timesheet/        marcações agrupadas por dia e navegação por mês
  generated/prisma/   cliente gerado pelo Prisma (não versionado)
  lib/                código compartilhado e testável: permissões, validação, cores, fuso horário,
                      regras da batida (cerca virtual, horário comercial), token do QR
  server/             regras de negócio e acesso a dados (somente servidor)
    auth/             configuração do Better Auth e helpers de sessão
  proxy.ts            redirecionamento otimista para o login
docs/                 documentação
```
