# Requisitos do Sistema de Ponto Eletrônico

> Documento vivo. Toda mudança de requisito deve ser feita via PR, com o motivo descrito.
> Última revisão: 2026-10-16 (Fase 1).

## 1. Visão geral

Sistema web (mobile friendly / PWA) para registro de ponto eletrônico de **uma única organização**, com
controle de jornada, solicitação e aprovação de ajustes, e conformidade com a
**Portaria MTE nº 671/2021** (REP-P — Registrador Eletrônico de Ponto via Programa).

## 2. Perfis de usuário

| Perfil | Bate ponto | Descrição |
|---|---|---|
| **Administrador** | Não | Usuário externo à operação. Acesso total ao sistema. |
| **RH** | Sim | Gerencia o ponto de todos e é a etapa final de aprovação de ajustes. |
| **Gestor** | Sim | Responsável por um setor. Primeira etapa de aprovação dos ajustes da sua equipe. |
| **Usuário** | Sim | Funcionário comum. Bate ponto e solicita ajustes. |

### 2.1 Matriz de permissões

| Funcionalidade | Admin | RH | Gestor | Usuário |
|---|:-:|:-:|:-:|:-:|
| Bater o próprio ponto | — | ✅ | ✅ | ✅ |
| Ver o próprio ponto / histórico | — | ✅ | ✅ | ✅ |
| Solicitar ajuste do próprio ponto | — | ✅ | ✅ | ✅ |
| Ver ponto da equipe (setor que gere) | ✅ | ✅ | ✅ | — |
| Ver ponto de todos os funcionários | ✅ | ✅ | — | — |
| Aprovar/rejeitar ajustes (etapa gestor) | ✅ | — | ✅ (só do seu setor) | — |
| Aprovar/rejeitar ajustes (etapa RH) | ✅ | ✅ | — | — |
| Cadastrar usuários | ✅ | ✅ | — | — |
| Cadastrar setores e definir gestores | ✅ | — | — | — |
| Cadastrar jornadas e feriados | ✅ | — | — | — |
| Configurações gerais e identidade visual | ✅ | — | — | — |
| Relatórios | ✅ | — | — | — |
| Logs de auditoria | ✅ | — | — | — |
| Dashboard | ✅ | ✅ | ✅ (do seu setor) | — |

> O RH **não** pode criar usuários com perfil Administrador.

## 3. Organização

- Uma única organização (não é multi-tenant).
- Funcionários pertencem a **um setor**. Cada setor tem **um gestor**.
- Todo funcionário que bate ponto tem setor, portanto tem gestor.
- Trocar o gestor de um setor muda automaticamente o aprovador de todos os funcionários daquele setor.

### 3.1 Identidade visual

- O **aplicativo** se chama **Pontual** e tem logo e favicon próprios e fixos (tela de login, aba do navegador, ícone do PWA).
- A **organização** pode personalizar, dentro do sistema: logo, cores principais e nome exibido.

## 4. Autenticação e cadastro

- Login por **e-mail + senha**.
- Não há autocadastro: contas são criadas pelo **Administrador** ou pelo **RH**.
- Ao ser cadastrado, o usuário recebe um e-mail de convite para definir a própria senha.
- Recuperação de senha por e-mail.

## 5. Registro de ponto

### 5.1 Marcações

- Registro por **botão na tela**.
- Até **8 marcações por dia**.
- O horário registrado é sempre o **do servidor** (hora legal brasileira), nunca o do dispositivo.
- Cada marcação recebe um **NSR** (Número Sequencial de Registro) único, sequencial e sem lacunas.
- Marcações são **imutáveis**: nunca são editadas ou apagadas. Correções acontecem via ajuste (seção 6).

### 5.2 Fora do horário

- Bater ponto fora do horário previsto na jornada é **permitido**, mas o sistema exibe um aviso de
  confirmação (ex.: _"Você está batendo o ponto fora do horário comercial. Deseja continuar?"_).
- Até as jornadas individuais existirem (Fase 3), a referência é o **horário comercial da empresa**
  (início, término e dias úteis), configurado pelo Administrador.
- A marcação fica sinalizada como "fora do horário".

### 5.3 Validações configuráveis

O Administrador define quais validações são **obrigatórias**. A configuração tem um valor padrão da
organização e pode ser **sobrescrita por funcionário** (ex.: quem trabalha remoto pode não precisar de cerca virtual).

| Validação | Comportamento |
|---|---|
| **Geolocalização — registro** | Captura e armazena a localização no momento da batida. |
| **Geolocalização — cerca virtual** | Só aceita a batida dentro do raio de um dos **locais permitidos** cadastrados (podem existir vários). |
| **Selfie** | Foto tirada na hora pela câmera frontal (não aceita galeria). Armazenada de forma privada: só o funcionário, o gestor do setor e o RH veem. Sem reconhecimento facial. |
| **QR code** | QR exibido em um painel na empresa (tablet ou monitor), que muda a cada minuto. O funcionário escaneia com a câmera do celular e é levado à tela de registro. |

## 6. Ajustes

### 6.1 Tipos

1. **Inclusão de marcação**: esqueceu de bater o ponto.
2. **Correção de marcação**: bateu em horário errado.
3. **Abono**: falta ou período justificado (ex.: atestado médico).

### 6.2 Regras

- **Justificativa** e **anexo** (foto, PDF) são opcionais por padrão. O Administrador pode tornar cada um obrigatório.
- Não há prazo para solicitar ajustes.
- A marcação original **é sempre mantida**. O ajuste é registrado como tratamento à parte, que prevalece
  no cálculo da jornada (exigência de auditoria e da Portaria 671).

### 6.3 Fluxo de aprovação

```
Usuário solicita
      │
      ▼
[Pendente — Gestor] ──rejeita (com comentário)──► [Rejeitado]
      │ aprova                                          │
      ▼                                                 │ usuário pode reenviar
[Pendente — RH] ─────rejeita (com comentário)──► [Rejeitado]   (nova solicitação
      │ aprova                                                  vinculada à anterior)
      ▼
[Aprovado]
```

- Duas etapas: **gestor do setor**, depois **RH**.
- Qualquer etapa pode rejeitar, com comentário.
- O usuário pode **reenviar** uma solicitação rejeitada. A nova solicitação guarda referência à anterior.
- O solicitante pode **cancelar** enquanto a solicitação estiver pendente.
- Autoaprovação (ex.: gestor aprovando o próprio pedido) **não é tratada no momento** (ver `TODO.md`).

### 6.4 Notificações

Por **e-mail** e **dentro do sistema**, nos eventos:

- Solicitação criada (notifica o gestor)
- Aprovada pelo gestor (notifica o RH e o solicitante)
- Aprovada pelo RH (notifica o solicitante)
- Rejeitada (notifica o solicitante, com o comentário)

## 7. Jornada

- Cada funcionário tem sua **própria jornada** (horários por dia da semana, escalas como 12x36, meio período, turnos).
- **Tolerância** de atraso configurável na área de gestão.
- Cadastro de **feriados** nacionais, estaduais e municipais.

## 8. Cálculos (fase futura)

Horas extras, banco de horas, atrasos, faltas e adicional noturno. Percentuais de hora extra e regras de
banco de horas são **configuráveis** pelo Administrador. Detalhes em `TODO.md`.

## 9. Dashboard

- Quem está trabalhando agora
- Atrasos e faltas do dia
- Ajustes pendentes de aprovação

O gestor vê apenas os dados do seu setor.

## 10. Relatórios e exportação

- Exportação para folha de pagamento (CSV/Excel): desejável.
- Espelho de ponto mensal em PDF: fora do MVP, planejado.

## 11. Auditoria

Toda ação relevante (login, batida, criação/alteração de cadastro, aprovação/rejeição, mudança de
configuração) gera um registro de auditoria com: autor, data/hora, ação, entidade afetada, valores antes/depois, IP.

## 12. Portaria MTE 671/2021

A base do sistema é construída compatível desde o início (marcações imutáveis, NSR, ajuste como
tratamento separado, hora do servidor). A conformidade completa fica em fase própria, detalhada em `TODO.md`.

> ⚠️ Os requisitos legais devem ser validados com o jurídico/contabilidade da organização.
> O registro do software no INPI e o certificado ICP-Brasil não dependem só do código.

## 13. Fases

| Fase | Escopo |
|---|---|
| 1. Base | Setup, autenticação, perfis, setores, cadastro de usuários, configurações e identidade visual |
| 2. Ponto | Batidas com NSR, aviso fora do horário, validações configuráveis |
| 3. Jornadas | Escalas, feriados, tolerância |
| 4. Ajustes | Solicitação, aprovação em duas etapas, notificações |
| 5. Cálculos | Horas extras, banco de horas, adicional noturno, faltas |
| 6. Dashboard e exportação | Dashboard e CSV para folha |
| 7. Portaria 671 | Comprovante assinado, AFD, AEJ |
| 8. Espelho de ponto | PDF mensal |
