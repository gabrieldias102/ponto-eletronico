# Changelog

Todas as mudanças relevantes do projeto são registradas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Não lançado]

### Adicionado — Fase 4 (ajustes)

- **Meus ajustes**: solicitações de inclusão de marcação, correção de marcação e abono (dia inteiro, vários dias
  ou parte de um dia), com justificativa e comprovante opcionais (foto ou PDF, privado)
- Atalhos no histórico: "Incluir marcação" no dia e "Corrigir" em cada marcação
- **Aprovações** em duas etapas: gestor do setor e RH (Admin decide nas duas); rejeição com comentário
  obrigatório; aba "Decididas por mim"; contador de pendências no menu
- Linha do tempo da solicitação (envio, decisões, comentários), **cancelamento** enquanto pendente e
  **reenvio** de solicitação rejeitada, já preenchido e vinculado à anterior
- **Marcações tratadas** no histórico, no ponto da equipe e na tela de registro: ajuste aprovado aparece como
  "incluída/corrigida por ajuste", a marcação corrigida fica visível como "desconsiderada" e o abono aparece no dia
- **Notificações** no sistema (sino com contador e página de notificações) e por e-mail a cada etapa
- Configuração para exigir justificativa e/ou comprovante

### Corrigido

- Textos dos e-mails (nomes, comentários) agora passam por escape de HTML
- Formulários enviam o botão clicado (`submitter`), como no envio nativo

### Adicionado — Fase 3 (jornadas)

- Menu **Jornadas** (Administrador) com as abas Jornadas, Feriados e Tolerância
- Jornadas **semanais** (até 4 períodos por dia, com "copiar segunda para terça a sexta") e **escalas em ciclo**
  (atalhos para 12x36 diurno/noturno, 24x48 e 6x1), com turno noturno e carga semanal calculada
- Jornada em uso tem os horários bloqueados; botão **Duplicar** para criar uma nova versão
- **Histórico de jornadas** no cadastro do funcionário, com atribuição a partir de uma data (Admin e RH)
- **Feriados** por ano, com importação dos feriados nacionais (e, opcionalmente, Carnaval e Corpus Christi)
- **Tolerância** por marcação e por dia (padrão CLT: 5 e 10 min) e margem do aviso de batida fora da jornada
- A tela de registro mostra a jornada do dia (ou folga/feriado), e o aviso passa a considerar a jornada do
  funcionário, inclusive turno noturno; sem jornada, continua valendo o horário comercial

### Alterado

- Abas de navegação reaproveitáveis (Configurações e Jornadas)
- Cartão "Registrar ponto" do Início mostra a última marcação sem quebrar a linha

### Adicionado — Fase 2 (registro de ponto)

- Tela **Registrar ponto** com relógio, botão de registro e marcações do dia (até 8 por dia)
- **NSR** sequencial e sem lacunas em cada marcação
- **Marcações imutáveis**: o banco recusa UPDATE, DELETE e TRUNCATE na tabela de marcações
- Aviso e confirmação ao bater ponto **fora do horário comercial**; a marcação fica sinalizada
- Validações configuráveis pelo Administrador, com exceções por funcionário:
  - **Localização** registrada na batida
  - **Cerca virtual** com vários locais permitidos (nome, coordenadas, raio)
  - **Selfie** ao vivo, armazenada de forma privada
  - **QR code rotativo** exibido em um painel público (`/painel-qr`), que muda a cada minuto
- Configurações → **Registro de ponto**: validações padrão, horário comercial, locais permitidos e link do painel
- **Meu histórico**: marcações do mês com navegação entre meses
- **Ponto da equipe**: marcações do dia por funcionário, quem está em jornada agora e quem não marcou.
  O gestor vê os setores que gerencia; o RH vê todos, com filtro por setor. Detalhe mensal por funcionário
- O login volta para a página de origem (`?next`), necessário para o link do QR code
- Auditoria das alterações de configuração de ponto, locais e QR code

### Corrigido

- Formulários enviados antes de a página carregar o JavaScript não colocam mais os campos na URL
  (no login, isso expunha a senha)

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
