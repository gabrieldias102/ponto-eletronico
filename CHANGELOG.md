# Changelog

Todas as mudanças relevantes do projeto são registradas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Não lançado]

### Adicionado — Fase 1 (base)

- Projeto Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui, com o nome **Pontual**
- Marca própria: logo, favicon (`icon.svg`) e manifesto PWA
- PostgreSQL local via Docker Compose; Prisma 7 com migrations e seed do administrador inicial
- Autenticação por e-mail e senha (Better Auth), sem autocadastro
- Convite por e-mail para o primeiro acesso, "esqueci a senha" e tela de definição de senha
- Bloqueio de login para usuários desativados; desativar encerra as sessões abertas
- Perfis Administrador, RH, Gestor e Usuário, com matriz de permissões central e testada
- Cadastro de usuários (Admin e RH; o RH não cria nem edita administradores)
- Cadastro de setores com gestor; funcionários que batem ponto precisam de setor
- Proteções: não é possível trocar o perfil ou desativar um gestor que ainda gerencia setor,
  nem alterar o próprio perfil ou se desativar
- Configurações da organização: nome, razão social, CNPJ/CPF, cor principal e logo
- Identidade visual da organização aplicada em toda a interface
- Log de auditoria (logins, definição de senha, cadastros e configurações) com tela de consulta
- Layout responsivo: barra lateral no desktop e menu lateral no celular
- Testes de unidade (Vitest) para permissões, validações e contraste de cores

### Adicionado — Documentação

- Documento de requisitos (`docs/requisitos.md`)
- Decisões de arquitetura (`docs/arquitetura.md`)
- Lista de itens futuros (`TODO.md`): cálculos, Portaria 671 e decisões pendentes
- README e este changelog
