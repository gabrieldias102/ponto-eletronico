# Pontual

Sistema web de registro de ponto eletrônico, mobile friendly, com controle de jornada, solicitação e
aprovação de ajustes e base preparada para a Portaria MTE nº 671/2021.

## Documentação

- [Requisitos](docs/requisitos.md): perfis, permissões, regras de ponto, ajustes e fases
- [Arquitetura](docs/arquitetura.md): stack, decisões, convenções e modelo de dados
- [TODO](TODO.md): itens planejados para fases futuras
- [Changelog](CHANGELOG.md): histórico de mudanças

## Stack

Next.js 16 · TypeScript · PostgreSQL (Neon) · Prisma 7 · Better Auth · Tailwind CSS · shadcn/ui · Vercel

## Rodando localmente

Requisitos: Node.js 22+ e Docker.

```bash
npm install
cp .env.example .env          # depois preencha BETTER_AUTH_SECRET
docker compose up -d          # Postgres na porta 5433
npm run db:migrate            # aplica as migrations
npm run db:seed               # cria a organização e o administrador inicial
npm run dev                   # http://localhost:3000
```

Entre com `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` do `.env`.

Sem `RESEND_API_KEY`, os e-mails (convites e redefinição de senha) aparecem **no console do servidor**,
com o link para definir a senha.

### Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Gera o cliente Prisma e o build de produção |
| `npm test` | Testes de unidade (Vitest) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run db:migrate` | Cria/aplica migrations em desenvolvimento |
| `npm run db:deploy` | Aplica migrations em produção |
| `npm run db:seed` | Cria o administrador inicial |
| `npm run db:studio` | Abre o Prisma Studio |

## Deploy na Vercel

1. Importe o repositório na Vercel e adicione as integrações **Neon** (Postgres) e **Blob**.
2. Configure as variáveis do `.env.example` (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
   `RESEND_API_KEY`, `EMAIL_FROM`, `BLOB_READ_WRITE_TOKEN`).
3. Rode `npm run db:deploy` e `npm run db:seed` apontando para o banco de produção.

## Como contribuir

1. Crie uma branch a partir da `main` (`feat/…`, `fix/…`, `docs/…`).
2. Faça commits no padrão Conventional Commits, em português.
3. Atualize a documentação e o `CHANGELOG.md` quando aplicável.
4. Abra um PR descritivo para a `main`.
