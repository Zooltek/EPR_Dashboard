# 📖 Manual do Usuário — Amura Dashboard

Bem-vindo ao **Manual do Usuário do Amura Dashboard**, o sistema de inteligência gerencial e análise comercial multiloja da sua empresa. Este documento detalha todas as funcionalidades, telas, indicadores (KPIs), gráficos e relatórios do sistema, explicando a lógica matemática de cada cálculo e as perguntas estratégicas de negócio que cada informação responde.

---

## 📑 Sumário

1. [Visão Geral da Interface & Navegação](#1-visão-geral-da-interface--navegação)
2. [Barra Superior de Filtros & Status](#2-barra-superior-de-filtros--status)
3. [Módulo: Visão Geral (Dashboard Executivo)](#3-módulo-visão-geral-dashboard-executivo)
4. [Módulo: Vendas](#4-módulo-vendas)
5. [Módulo: Produtos / Estoque](#5-módulo-produtos--estoque)
6. [Módulo: Clientes](#6-módulo-clientes)
7. [Módulo: Comparativo de Lojas](#7-módulo-comparativo-de-lojas)
8. [Módulo: Arquivos PBI & Importações](#8-módulo-arquivos-pbi--importações)
9. [Módulo: Lojas & Configurações](#9-módulo-lojas--configurações)
10. [Glossário de Termos e Boas Práticas Gerenciais](#10-glossário-de-termos-e-boas-práticas-gerenciais)

---

## 1. Visão Geral da Interface & Navegação

O **Amura Dashboard** foi projetado para fornecer acesso instantâneo aos dados mais vitais do negócio, operando tanto no formato Web quanto no formato Desktop (Windows).

- **Menu Lateral (Sidebar)**:
  - **Logotipo da Empresa**: Personalizável através da tela de configurações.
  - **Menu de Navegação**: Acesso direto aos 7 módulos do sistema.
  - **Status do Sistema**: Indicador visual de conexão e versão do software.
- **Tema Claro / Escuro**: Botão no canto superior direito para alternar a qualquer momento entre modo escuro (Dark Mode) e modo claro (Light Mode).
- **Recarregamento Rápido**: Botão de sincronização imediata com os arquivos PBI e FTP.

---

## 2. Barra Superior de Filtros & Status

A barra de filtros está presente no topo de todas as telas e atualiza os dados em tempo real:

### ⏱️ Filtros de Período
- **Hoje**: Vendas e movimentações do dia atual.
- **Últimos 3 dias**: Janela curta de acompanhamento.
- **Últimos 7 dias**: Desempenho da semana corrente.
- **Últimos 15 dias**: Quinzena.
- **Este Mês**: Do dia 1º até a data atual do mês vigente.
- **Mês Anterior**: Do dia 1º ao último dia do mês passado (ideal para fechamentos).
- **Personalizado**: Selecione livremente a Data Inicial e Data Final no calendário.

### 🏢 Filtros Dimensionais
- **Todas as Lojas / Filtro por Loja**: Permite analisar os dados consolidados da rede ou isolar uma unidade específica.
- **Vendedor**: Filtra as vendas por um vendedor específico (atualiza dinamicamente de acordo com a loja selecionada).
- **Marca / Grupo / Família / Coleção**: Filtros avançados de categorias de produtos.

### 🟢 Status das Lojas
- Exibe quantas lojas da rede já enviaram dados atualizados no dia (ex: `3 de 3 lojas atualizadas`).
- Se o sistema acabou de ser instalado e ainda não leu arquivos PBI, exibe: `Aguardando primeiro PBI`.

---

## 3. Módulo: Visão Geral (Dashboard Executivo)

O painel central de tomada de decisão rápida para diretores e gerentes gerais.

### 🎴 Cards de KPI (Indicadores-Chave)

| Card | Como é Calculado? | Pergunta de Negócio que Responde |
| :--- | :--- | :--- |
| **Faturamento Líquido** | `Soma(Total Líquido dos Itens de Venda) - Estornos/Cancelamentos` | *Quanto a empresa realmente vendeu no período selecionado?* |
| **Quantidade de Vendas** | `Contagem distinta de cupons/vendas finalizadas não canceladas` | *Quantos atendimentos/compras foram concluídos no caixa?* |
| **Ticket Médio** | `Faturamento Líquido / Quantidade de Vendas` | *Quanto cada cliente gasta, em média, por compra na loja?* |
| **Itens Vendidos** | `Soma da quantidade física de peças/produtos vendidos` | *Qual foi o volume físico de mercadorias movimentado?* |
| **Itens por Venda (PA)** | `Total de Itens Vendidos / Quantidade de Vendas` | *Quantas peças o cliente leva em média por cupom? O time faz venda cruzada?* |
| **Preço Médio por Item**| `Faturamento Líquido / Total de Itens Vendidos` | *Qual é o valor médio cobrado por unidade vendida?* |
| **Descontos Concedidos** | `Soma dos descontos aplicados nos itens e cabeçalhos` | *Quanto dinheiro a loja abriu mão em promoções e descontos no período?* |
| **Acréscimos** | `Soma dos acréscimos, juros e taxas cobradas na venda` | *Houve receitas adicionais agregadas às vendas?* |
| **Custo Estimado** | `Soma(Quantidade Vendida × Preço de Custo de cada Produto)` | *Quanto custaram para a empresa os produtos que foram vendidos?* |
| **Margem Bruta (R$)** | `Faturamento Líquido - Custo Estimado` | *Qual foi o lucro bruto gerado antes das despesas operacionais e fixas?* |
| **Margem Bruta (%)** | `(Margem Bruta em R$ / Faturamento Líquido) × 100` | *Qual é a eficiência percentual de lucratividade sobre a venda?* |

> [!NOTE]
> Todos os cards principais possuem um **badge comparativo** em relação ao período imediatamente anterior de mesma duração (ex: se você selecionou os últimos 7 dias, ele compara com os 7 dias anteriores, mostrando `+12.5%` em verde ou `-4.2%` em vermelho).

---

### 📊 Gráficos da Visão Geral

#### 1. Evolução Diária de Vendas (Faturamento por Dia)
- **O que mostra**: Linha do tempo diária com o total faturado e quantidade de vendas dia a dia.
- **Pergunta que responde**: *Quais dias da semana têm maior faturamento? Há sazonalidade (ex: picos aos sábados ou quintas-feiras)? As metas diárias estão sendo atingidas?*

#### 2. Faturamento por Loja (Ranking de Unidades)
- **O que mostra**: Gráfico de barras comparando a performance financeira de cada filial.
- **Pergunta que responde**: *Qual loja é o carro-chefe da empresa? Qual unidade está abaixo da média e necessita de ação promocional ou treinamento?*

#### 3. Formas de Pagamento (Participação %)
- **O que mostra**: Gráfico de distribuição com a participação percentual de cada modalidade (Cartão de Crédito, Débito, PIX, Dinheiro, Crediário, etc.).
- **Pergunta que responde**: *Qual é a dependência de taxas de cartão? O PIX está crescendo? Quanto capital entra imediatamente vs prazo?*

#### 4. Top 10 Produtos Mais Vendidos
- **O que mostra**: As 10 mercadorias que mais geraram faturamento no período.
- **Pergunta que responde**: *Quais são os itens campeões de venda que nunca podem faltar no estoque?*

#### 5. Top Vendedores da Rede
- **O que mostra**: Ranking dos vendedores com faturamento total, quantidade de atendimentos e ticket médio individual.
- **Pergunta que responde**: *Quem são os melhores vendedores da equipe? Quem está conseguindo maior ticket médio?*

---

## 4. Módulo: Vendas

Análise aprofundada do comportamento comercial, horários e categorização de sortimento.

### 🎴 Cards do Módulo
- **Faturamento Líquido**, **Quantidade de Vendas**, **Ticket Médio** e **Itens Vendidos**.

---

### 📊 Gráficos do Módulo de Vendas

#### 1. Vendas por Horário do Dia (Com Ferramenta de Zoom)
- **Como é calculado**: Agrupamento das vendas pela hora gravada no cupom fiscal (`h_venda` no formato `HH:00`).
- **Recursos**: Ferramenta interativa de Zoom no canto superior direito para aproximar períodos de alta intensidade.
- **Pergunta que responde**:
  - *Qual é o horário de pico de fluxo e faturamento das lojas?*
  - *Como dimensionar a escala de funcionários, horários de almoço e folgas sem desfalcar o atendimento nos momentos mais lucrativos?*

#### 2. Desempenho por Vendedor (Tabela Detalhada)
- **O que mostra**: Lista de vendedores com Vendas Concluídas, Faturamento Total e Ticket Médio por Vendedor.
- **Pergunta que responde**: *O vendedor vende muito com ticket baixo (atende muitos clientes rápido) ou vende poucos itens de alto valor?*

#### 3. Análise de Curva ABC de Produtos (Parâmetros 20% / 30% / 50%)
A Curva ABC é uma das ferramentas gerenciais mais consagradas do varejo mundial. O sistema classifica todo o catálogo vendido em 3 categorias estratégicas:

- **Classe A (Top 20% dos itens)**: Os produtos de altíssima relevância que respondem pela maior fatia da receita ou do volume.
- **Classe B (Próximos 30% dos itens)**: Produtos de média relevância e giro intermediário.
- **Classe C (Restantes 50% dos itens)**: A cauda longa da loja; itens de menor giro unitário.

**Alternância em 1 Clique**:
- 💵 **Filtro por Valor (R$)**: Classifica a Curva ABC pelo faturamento gerado. Responde: *Quais 20% de produtos geram a maior parte do dinheiro que entra no caixa?*
- 📦 **Filtro por Quantidade (un)**: Classifica a Curva ABC pelo volume de peças vendidas. Responde: *Quais 20% de produtos são os mais embalados e movimentados no balcão?*

**Elementos da Curva ABC**:
1. **Cards de Resumo**: Total faturado/volume de cada classe e percentual de participação sobre o todo.
2. **Gráfico Pareto**: Visualização com cores distintas (🟢 Classe A, 🟡 Classe B, ⚪ Classe C).
3. **Tabela Paginada**: Listagem completa com busca, badge da classe e % acumulado.

---

## 5. Módulo: Produtos / Estoque

Foco total em **saúde financeira do estoque**, identificação de capital parado e rentabilidade potencial.

### 🎴 Cards de Estoque

| Card | Como é Calculado? | Pergunta de Negócio que Responde |
| :--- | :--- | :--- |
| **Produtos Cadastrados** | `Contagem distinta de referências (ref_id) no estoque` | *Quantos modelos/produtos diferentes compõem a grade atual?* |
| **Total em Estoque** | `Soma da quantidade física (qtd) de todas as peças` | *Quantas unidades físicas estão guardadas nas lojas e depósitos?* |
| **Capital investido** | `Soma(Quantidade em Estoque × Preço de Custo)` | *Quanto dinheiro em caixa da empresa está imobilizado em mercadorias nas prateleiras?* |
| **Potencial de faturamento** | `Soma(Quantidade em Estoque × Preço de Venda da Tabela)` | *Se todo o estoque for vendido pelo preço de tabela sem descontos, quanto vai gerar de receita bruta?* |
| **Lucro bruto potencial** | `Potencial de Faturamento - Capital Investido` + `% Margem` | *Qual é o ganho financeiro projetado ao liquidar o estoque atual?* |

---

### 📊 Gráficos de Estoque

#### 1. Estoque por Idade da Última Venda (Faixas de Giro)
- **Como é calculado**: Para cada produto com estoque físico > 0, o sistema busca a data da última venda registrada (`MAX(data_venda)`) e calcula a quantidade de dias decorridos até hoje.
- **As 4 Faixas**:
  - 🟢 **Até 30 dias (Giro Saudável)**: Capital circulando com rapidez.
  - 🟡 **31 a 60 dias**: Giro moderado.
  - 🟠 **61 a 90 dias**: Alerta de desaceleração de vendas.
  - 🔴 **+90 dias (Estagnado / Parado)**: Capital envelhecendo e imobilizado.
- **Pergunta que responde**: *Quanto por cento do capital investido está saudável e girando rápido vs quanto está envelhecendo e correndo risco de depreciação?*

#### 2. Estoque Parado — Top 10 Produtos (Barras Horizontais)
- **Como funciona**: Gráfico horizontal que ranqueia os 10 produtos que mais concentram valor em reais sem nenhuma venda no período definido.
- **Seletor de Inatividade**:
  - `[ 30 dias ▾ | 60 dias | 90 dias | 180 dias ]`
- **Card de Destaque**: Exibe o **Capital Total Parado** para o período selecionado (ex: `R$ 185.000,00 parado há mais de 30 dias`).
- **Pergunta que responde**: *Onde exatamente está concentrado o dinheiro parado da empresa? Quais são os produtos que devem entrar em liquidação, queima de estoque ou transferência imediata?*

#### 3. Tabela Completa de Produtos com Estoque Parado & Ficha do Produto
- **Tabela**: Exibe todos os produtos parados com busca em tempo real por nome, código ou marca.
- **Ficha do Produto (Modal)**: Ao clicar em qualquer linha da tabela ou barra do gráfico, abre uma janela com a ficha completa:
  - Referência e Marca.
  - Estoque Físico e Custo Unitário.
  - Preço de Tabela e Margem.
  - Valor Total Investido Parado.
  - Data exata da última venda e total de dias sem movimentação.

---

## 6. Módulo: Clientes

Compreensão da base de compradores, fidelização e aniversariantes.

### 🎴 Indicadores & Relatórios
- **Aniversariantes do Período**:
  - Identifica automaticamente clientes que fazem aniversário no período filtrado.
  - Exibe dia, mês, nome, telefone/e-mail e CPF/CNPJ.
  - *Ação de negócio*: Envio de mensagens de felicitações com cupom de desconto exclusivo de aniversário para atrair o cliente para a loja.
- **Ranking de Melhores Clientes**:
  - Lista os clientes por volume total de compras e faturamento gerado.
  - *Ação de negócio*: Identificar clientes VIPs e criar programas de fidelidade ou atendimento personalizado.

---

## 7. Módulo: Comparativo de Lojas

Métricas de benchmarking entre unidades da mesma rede.

- **Ranking de Lojas por Faturamento e Vendas**: Gráficos e tabelas comparativas em barras.
- **Matriz Comparativa**:
  - Faturamento Total de cada filial.
  - Quantidade de Vendas e Ticket Médio individual.
  - Itens Vendidos e % de Participação sobre o faturamento global da empresa.
- **Pergunta que responde**: *Qual unidade tem o melhor ticket médio? Qual vende mais peças por cliente? Como distribuir melhor as metas entre as lojas?*

---

## 8. Módulo: Arquivos PBI & Importações

Painel de auditoria técnica e integridade de dados.

- **Monitoramento de Cargas**:
  - Lista todos os arquivos `.zip` do PowerBI processados.
  - Exibe data do arquivo, data de processamento, tamanho, CNPJ da loja e status (`SUCESSO`, `IGNORADO`, `ERRO`).
- **Tratamento de Arquivos Inválidos**:
  - Arquivos que não seguem o padrão `PBI_*.zip` são ignorados com segurança sem gerar logs de erro desnecessários.
  - Arquivos corrompidos são registrados com o motivo exato.
- **Idempotência**: O sistema não reprocessa arquivos idênticos já integrados, evitando duplicação de dados.

---

## 9. Módulo: Lojas & Configurações

Administração do sistema, sincronização e segurança.

### 🏢 Cadastro de Lojas
- Lista de lojas ativas, CNPJs vinculados e apelidos de exibição.

### ☁️ Configurações de FTP
- **Provedores Suportados**:
  - `VixHost`
  - `UOLHost`
  - `Personalizado` (Host, Porta, Usuário, Senha e Pasta do Cliente).
- **Pasta Local de PBI**:
  - Caminho configurável no computador para consumo direto de arquivos PBI locais.
  - **Watcher em Tempo Real**: Assim que um novo arquivo PBI é copiado para a pasta local, o dashboard o processa e atualiza os gráficos automaticamente em menos de 3 segundos!

### 💾 Backup e Restauração de Dados
- **Opção de Backup Local**: Cria uma cópia íntegra do banco de dados SQLite (`database.sqlite`) em arquivo carimbado com data e hora.
- **Restauração**: Permite restaurar bases anteriores com total segurança.

---

## 10. Glossário de Termos e Boas Práticas Gerenciais

- **Faturamento Bruto**: Valor total de tabela dos produtos antes de descontos.
- **Faturamento Líquido**: O valor real que efetivamente entra no caixa após descontos concedidos e estorno de cancelamentos.
- **Ticket Médio**: Indicador de eficiência que mede o valor médio gasto por atendimento. Aumentar o ticket médio através de itens adicionais é a forma mais barata de aumentar o faturamento sem gastar mais com atração de clientes.
- **PA (Peças por Atendimento)**: Quantidade média de itens por cupom. Mede a habilidade da equipe em sugerir produtos complementares (venda cruzada).
- **Giro de Estoque**: A velocidade com que as mercadorias são vendidas e repostas.
- **Estoque Parado (+90 dias)**: Mercadoria que não teve saída nos últimos 3 meses. Representa dinheiro bloqueado que poderia estar rendendo juros ou sendo reinvestido em produtos de alta demanda.
- **Curva ABC**: Método de Pareto que prioriza os 20% de produtos mais importantes (Classe A), garantindo que eles recebam maior atenção em reposição e visibilidade.

---

*Manual elaborado pela equipe de desenvolvimento e inteligência de dados do **Amura Dashboard**.*
