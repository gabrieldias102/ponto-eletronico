# TODO

Itens planejados que **não** fazem parte do escopo atual. Ao concluir um item, marque-o e cite o PR.

## Fases

- [x] **Fase 1 — Base**: setup, autenticação, perfis, setores, cadastro de usuários, configurações, identidade visual (branch `feat/fase-1-base`)
- [ ] **Fase 2 — Ponto**: batidas com NSR, aviso fora do horário, validações configuráveis
- [ ] **Fase 3 — Jornadas**: escalas, feriados, tolerância
- [ ] **Fase 4 — Ajustes**: solicitação, aprovação em duas etapas, notificações
- [ ] **Fase 5 — Cálculos** (ver abaixo)
- [ ] **Fase 6 — Dashboard e exportação**
- [ ] **Fase 7 — Portaria 671** (ver abaixo)
- [ ] **Fase 8 — Espelho de ponto em PDF**

## Cálculos (Fase 5)

- [ ] Motor de cálculo isolado e coberto por testes (`src/server/calculations/`)
- [ ] Horas trabalhadas por dia, a partir das marcações + ajustes aprovados
- [ ] Atrasos e saídas antecipadas, respeitando a tolerância configurada
- [ ] Faltas (dia previsto na jornada, sem marcação e sem abono)
- [ ] Horas extras com percentuais configuráveis (ex.: 50% dia útil, 100% domingo/feriado)
- [ ] Banco de horas: saldo, validade e regras de compensação configuráveis
- [ ] Adicional noturno (22h às 5h) com hora noturna reduzida (52min30s)
- [ ] Jornadas que atravessam a meia-noite
- [ ] Intervalo intrajornada e interjornada (alertas de descumprimento)
- [ ] Feriados aplicados conforme a abrangência (nacional, estadual, municipal)
- [ ] Fechamento de período (congelar cálculos de um mês)

## Portaria MTE 671/2021 (Fase 7)

- [ ] Validar requisitos com jurídico/contabilidade
- [ ] Registro do software no **INPI**
- [ ] **Atestado Técnico e Termo de Responsabilidade** do fabricante do programa
- [ ] **Comprovante de registro de ponto** a cada marcação, disponível ao funcionário (download/e-mail)
- [ ] **Assinatura digital** do comprovante com certificado **ICP-Brasil** (e-CNPJ da organização)
- [ ] Gerenciamento seguro do certificado (armazenamento, senha, renovação)
- [ ] Geração do **AFD** (Arquivo Fonte de Dados) no layout oficial
- [ ] Geração do **AEJ** (Arquivo Eletrônico de Jornada) no layout oficial
- [ ] Assinatura digital dos arquivos AFD e AEJ
- [ ] Sincronização com a hora legal brasileira (documentar fonte e monitorar desvio)
- [ ] Revisar se o NSR e a imutabilidade das marcações atendem aos layouts oficiais
- [ ] Identificação do empregador (CNPJ/CPF, razão social, local) nas configurações

## Relatórios

- [ ] Exportação para folha de pagamento (CSV/Excel)
- [ ] Espelho de ponto mensal em PDF (Fase 8)

## Decisões pendentes

- [x] Nome, logo e favicon do aplicativo: **Pontual**
- [ ] Autoaprovação: quem aprova o ajuste de um gestor do próprio setor, ou de alguém do RH
- [ ] Política de retenção de selfies e anexos (LGPD)

## Melhorias levantadas na Fase 1

- [ ] Ícones PNG do PWA (192/512 px e `apple-icon` para iOS); hoje só há o `icon.svg`
- [ ] Testes E2E (Playwright) dos fluxos de login, convite e cadastro
- [ ] Apagar do Blob o logo antigo ao trocar ou remover o logo
- [ ] Ao definir a senha com outra sessão aberta no navegador, encerrar essa sessão antes de ir para o login
- [ ] Revisar limites de tentativa de login (rate limit do Better Auth) para produção
- [ ] Modo escuro (os tokens já existem no `globals.css`)
