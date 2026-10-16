# Arquitetura

> Decisões técnicas do projeto. Ao mudar uma decisão, atualize este arquivo no mesmo PR e explique o motivo.

## 1. Stack

| Camada | Escolha | Motivo |
|---|---|---|
| Framework | **Next.js** (App Router) + **TypeScript** | React e Node no mesmo projeto. É o caso nativo da Vercel. |
| Banco | **PostgreSQL** na **Neon** | Postgres serverless com integração oficial da Vercel. |
| ORM | **Prisma** | Schema tipado e migrations versionadas. |
| Autenticação | **Better Auth** (e-mail + senha) | Sessões no banco, sem autocadastro, convite e reset de senha. |
| UI | **Tailwind CSS** + **shadcn/ui** | Componentes acessíveis, fáceis de personalizar com as cores da organização. |
| Formulários | **React Hook Form** + **Zod** | Validação compartilhada entre cliente e servidor. |
| Arquivos | **Vercel Blob** | Selfies, anexos de ajustes e logos. |
| E-mail | **Resend** + **React Email** | Convites, reset de senha e notificações. |
| Testes | **Vitest** (unidade) e **Playwright** (E2E, depois) | O motor de cálculo exige cobertura alta. |
| Mobile | **PWA** responsivo | Instalável no celular sem app nativo. Acesso a câmera e GPS pelo navegador. |
| Deploy | **Vercel** | Preview automático por PR. |

## 2. Convenções

- **Código** (variáveis, funções, tabelas, rotas de API) em **inglês**.
- **Interface, documentação, commits e PRs** em **português**.
- Commits no padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/): `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
- Branches: `main` protegida; uma branch por funcionalidade (`feat/…`, `fix/…`, `docs/…`); integração só via PR.
- Toda mudança relevante entra no `CHANGELOG.md`.

## 3. Princípios de domínio

1. **Marcação é imutável.** A tabela de marcações só recebe `INSERT`. Ajustes são registros separados que
   prevalecem sobre a marcação no cálculo.
2. **Hora do servidor.** O horário da batida vem do servidor/banco, nunca do cliente.
   Armazenamento em `timestamptz` (UTC); exibição em `America/Sao_Paulo`.
3. **NSR** gerado por uma `SEQUENCE` do Postgres, dentro da mesma transação da marcação.
4. **Permissões no servidor.** Toda checagem de perfil acontece no servidor (server actions/rotas).
   A interface apenas esconde o que o usuário não pode usar.
5. **Auditoria** em todas as escritas relevantes.

## 4. Modelo de dados (rascunho)

```
Organization       configurações gerais, identidade visual, validações padrão
User               nome, e-mail, perfil (ADMIN | HR | MANAGER | EMPLOYEE), setor, jornada, ativo
Department         nome, gestor (User)
WorkSchedule       jornada: tipo (semanal, 12x36, ...), regras por dia
PunchPolicy        validações exigidas (geo, cerca, selfie, QR); padrão da org ou por usuário
AllowedLocation    local permitido para a cerca virtual: lat, lng, raio
Holiday            data, nome, abrangência (nacional, estadual, municipal)
TimeEntry          marcação: NSR, usuário, horário, geolocalização, selfie, QR, IP, fora_do_horario
AdjustmentRequest  tipo, datas/horários, justificativa, anexo, status, etapa, referência à anterior
AdjustmentReview   etapa (gestor | RH), revisor, decisão, comentário, data
Notification       usuário, tipo, conteúdo, lida
AuditLog           autor, ação, entidade, antes/depois, IP, data
```

O schema definitivo nasce em `prisma/schema.prisma` na fase 1 e evolui por migrations.

## 5. Estrutura de pastas (prevista)

```
src/
  app/              rotas (App Router), agrupadas por área: (auth), (app)/ponto, (app)/ajustes, (app)/admin
  components/       componentes de UI
  server/           regras de negócio e acesso a dados (nunca importado pelo cliente)
    auth/
    permissions/
    time-entries/
    adjustments/
    audit/
  lib/              utilitários compartilhados
prisma/             schema e migrations
docs/               documentação
```
