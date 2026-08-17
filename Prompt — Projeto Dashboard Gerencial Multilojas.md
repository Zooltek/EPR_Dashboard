# PROJETO: DASHBOARD GERENCIAL MULTILOJAS

## 1. OBJETIVO

Desenvolver um Dashboard Gerencial Web para empresas que possuem uma ou várias lojas, utilizando como fonte de dados os arquivos PBI exportados pelo ERP.

O PBI é um arquivo ZIP contendo os arquivos XML necessários para alimentar os indicadores gerenciais.

As lojas enviam seus arquivos PBI para um FTP central já utilizado pelo ERP.

O Dashboard deverá acessar esse FTP, identificar os novos arquivos PBI, identificar automaticamente a loja através do CNPJ existente no nome do arquivo, baixar o ZIP, descompactar, processar os XML, armazenar os dados no banco de dados e disponibilizar os indicadores no Dashboard.

O sistema deverá ser desenvolvido desde o início com suporte a:

- Multiempresa;
- Multilojas;
- Importação incremental;
- Controle de duplicidade;
- Histórico de importações;
- Filtros por período;
- Comparação entre períodos;
- Comparação entre lojas.

---

# 2. ARQUIVO PBI

O arquivo enviado pelo ERP possui extensão `.zip`.

O padrão do nome do arquivo é:

`PBI_<CNPJ>_<AAAAMMDD>_<HHMMSS>.zip`

Exemplo:

`PBI_39310768000105_20260626_141555.zip`

Interpretar:

- Prefixo: `PBI`
- CNPJ: `39310768000105`
- Data de geração: `2026-06-26`
- Hora de geração: `14:15:55`

O CNPJ presente no nome do arquivo deverá ser utilizado para identificar a loja.

O Dashboard NÃO deverá utilizar a data do nome do arquivo como data das vendas.

A data/hora do nome do arquivo representa o momento em que o pacote PBI foi gerado pelo ERP.

As datas utilizadas nos indicadores de vendas, estoque, clientes etc. deverão ser obtidas dos próprios XML.

---

# 3. ARQUIVO DE REFERÊNCIA

Existe um arquivo:

`PBI.zip`

Esse arquivo contém exemplos reais da estrutura utilizada pelo ERP.

Antes de iniciar a implementação, analisar completamente esse arquivo.

Não assumir a estrutura dos XML.

Ler e documentar:

- nome dos arquivos;
- estrutura dos XML;
- campos;
- tipos;
- chaves;
- relacionamentos;
- campos de data;
- campos de hora;
- valores monetários;
- quantidades;
- identificadores;
- relacionamentos entre tabelas.

Arquivos esperados dentro do PBI incluem:

- Cliente.xml
- Colecao.xml
- Cor.xml
- Estoque.xml
- Familia.xml
- Grupo.xml
- Loja.xml
- Marca.xml
- Produto.xml
- Tamanho.xml
- VendaCab.xml
- VendaItem.xml
- Vendedor.xml

Caso a estrutura real seja diferente, utilizar a estrutura encontrada no arquivo PBI como fonte oficial.

---

# 4. REGRA DE IDENTIFICAÇÃO DA LOJA

Todos os arquivos PBI das lojas ficam juntos no mesmo FTP.

Não existe necessidade de uma pasta FTP diferente para cada loja.

A separação é feita pelo CNPJ presente no nome do arquivo.

Exemplo:

`PBI_39310768000105_20260626_141555.zip`

O sistema deverá:

1. identificar o padrão do arquivo;
2. extrair o CNPJ;
3. localizar o CNPJ no cadastro de lojas;
4. identificar a empresa;
5. identificar a loja;
6. extrair data e hora da geração;
7. registrar o arquivo;
8. processar o ZIP.

Criar validação para arquivos cujo nome não esteja no padrão esperado.

Exemplo de arquivo inválido:

`PBI_arquivo.zip`

Esse arquivo não deverá ser processado e deverá ser registrado no log como inválido.

---

# 5. CADASTRO DE EMPRESAS E LOJAS

Criar estrutura:

Empresa

- ID
- Razão Social
- CNPJ
- Nome Fantasia
- Status

Loja

- ID
- Empresa
- CNPJ
- Nome
- Código da loja, se disponível
- Status

O CNPJ da loja deverá ser único.

O sistema deverá permitir que uma empresa tenha várias lojas.

Exemplo:

Empresa A

- Loja Centro
- Loja Shopping
- Loja Norte

Empresa B

- Loja 01
- Loja 02

Os dados de empresas diferentes nunca poderão ser misturados.

---

# 6. FTP

IMPORTANTE:

As configurações de FTP já são realizadas no ERP.

O Dashboard NÃO deverá criar como requisito principal uma tela para o usuário informar:

- servidor;
- usuário;
- senha;
- porta.

O FTP já existe e é utilizado pelas lojas para enviar os arquivos PBI.

O serviço do Dashboard deverá apenas acessar o FTP configurado para localizar os arquivos PBI.

A implementação deverá ser preparada para utilizar as credenciais/configurações de acesso ao FTP fornecidas ao serviço.

O processo deverá:

1. conectar ao FTP;
2. listar os arquivos;
3. localizar arquivos `.zip` com padrão `PBI_<CNPJ>_<AAAAMMDD>_<HHMMSS>.zip`;
4. identificar o CNPJ;
5. identificar a loja;
6. verificar se o arquivo já foi processado;
7. baixar somente arquivos novos;
8. descompactar;
9. validar os XML;
10. processar os dados;
11. gravar no banco;
12. registrar o processamento;
13. disponibilizar os dados no Dashboard.

---

# 7. IMPORTAÇÃO INCREMENTAL

O sistema não deverá processar novamente todos os arquivos existentes no FTP a cada execução.

Criar controle de arquivos processados.

Registrar pelo menos:

- nome do arquivo;
- CNPJ;
- loja;
- empresa;
- data do PBI;
- hora do PBI;
- tamanho;
- hash, quando aplicável;
- data/hora de download;
- data/hora de processamento;
- status;
- mensagem de erro;
- quantidade de registros processados.

Se o mesmo arquivo for encontrado novamente:

`PBI_39310768000105_20260626_141555.zip`

não deverá ser processado novamente.

O processo deverá ser idempotente.

---

# 8. DESCOMPACTAÇÃO DO PBI

Após baixar um PBI:

1. criar diretório temporário;
2. descompactar o ZIP;
3. validar os arquivos;
4. processar os XML;
5. concluir a importação;
6. registrar o resultado;
7. remover arquivos temporários quando não forem mais necessários.

Nunca processar diretamente o ZIP sem validação.

Criar tratamento para:

- ZIP corrompido;
- XML inválido;
- XML ausente;
- XML duplicado;
- estrutura inesperada;
- arquivo incompleto.

---

# 9. BANCO DE DADOS

Não utilizar os XML diretamente para alimentar os gráficos.

Os dados deverão ser armazenados em banco de dados.

Criar estrutura adequada para:

- empresas;
- lojas;
- vendedores;
- clientes;
- produtos;
- marcas;
- grupos;
- famílias;
- coleções;
- cores;
- tamanhos;
- estoque;
- vendas;
- itens de venda;
- formas de pagamento;
- histórico de importações;
- arquivos PBI processados.

Criar índices para consultas por:

- empresa;
- loja;
- data;
- produto;
- vendedor;
- cliente;
- venda.

---

# 10. RELACIONAMENTO ENTRE VENDAS E ITENS

Analisar os XML reais antes de implementar.

O relacionamento esperado entre VendaCab.xml e VendaItem.xml deverá ser confirmado através dos arquivos.

Utilizar os identificadores corretos encontrados no XML.

Não duplicar vendas ao relacionar cabeçalho e itens.

---

# 11. CONTROLE DE ATUALIZAÇÃO DAS LOJAS

O Dashboard deverá mostrar claramente a situação de atualização de cada loja.

Exemplo:

| Loja | Último PBI | Data | Hora | Status |
|---|---|---|---|---|
| Centro | PBI_... | 26/06/2026 | 21:48 | Atualizada |
| Shopping | PBI_... | 26/06/2026 | 21:52 | Atualizada |
| Norte | PBI_... | 25/06/2026 | 21:31 | Aguardando |

Criar status como:

- Atualizada;
- Aguardando atualização;
- Erro;
- CNPJ não cadastrado;
- Arquivo inválido.

Exibir no Dashboard:

`Última atualização: DD/MM/AAAA HH:MM`

Também exibir:

`X de Y lojas atualizadas`

O usuário nunca deverá interpretar dados antigos como se fossem dados atuais.

---

# 12. FILTROS GLOBAIS

Todos os dashboards deverão possuir filtros globais.

Filtros rápidos:

- Hoje;
- Últimos 3 dias;
- Últimos 7 dias;
- Este mês;
- Mês anterior;
- Período personalizado.

Não criar o filtro "Esta semana".

Também permitir filtro por:

- empresa;
- loja;
- vendedor;
- produto;
- marca;
- grupo;
- família;
- coleção.

Os filtros deverão funcionar de forma consistente em todos os gráficos e indicadores.

---

# 13. COMPARAÇÃO COM PERÍODO ANTERIOR

Sempre que possível, os KPIs deverão apresentar comparação com o período anterior equivalente.

Exemplo:

Período selecionado:

01/06 a 30/06

Comparação:

01/05 a 31/05

Exibir:

Faturamento

`R$ 125.450,00`

`+12,5%`

Também aplicar comparação para:

- quantidade de vendas;
- ticket médio;
- itens vendidos;
- desconto;
- margem.

Quando não houver dados suficientes para comparação, informar claramente.

---

# 14. DASHBOARD PRINCIPAL — VISÃO GERAL

Criar tela:

`Visão Geral`

Essa será a principal tela do sistema.

No topo:

- empresa;
- loja;
- período;
- última atualização.

KPIs principais:

### Faturamento

Valor líquido das vendas válidas.

### Quantidade de vendas

Quantidade de vendas válidas.

### Ticket médio

`Faturamento / quantidade de vendas`

### Itens vendidos

Quantidade total de itens vendidos.

### Itens por venda

`Itens vendidos / quantidade de vendas`

### Preço médio por item

`Faturamento / itens vendidos`

### Desconto

Valor total de descontos.

### Acréscimo

Valor total de acréscimos.

### Margem estimada

Faturamento líquido menos custo estimado.

### Margem %

Margem estimada dividida pelo faturamento líquido.

---

# 15. GRÁFICOS DA VISÃO GERAL

Criar:

## Faturamento por dia

Gráfico de linha.

## Quantidade de vendas por dia

Gráfico de barras.

## Faturamento por loja

Gráfico de barras comparativo.

## Formas de pagamento

Gráfico de rosca.

Considerar todas as formas de pagamento existentes no VendaCab.xml.

## Top 10 produtos

Exibir:

- produto;
- quantidade;
- faturamento.

## Top vendedores

Exibir:

- vendedor;
- quantidade de vendas;
- faturamento;
- ticket médio.

---

# 16. TELA DE VENDAS

Criar tela:

`Vendas`

KPIs:

- faturamento;
- vendas;
- ticket médio;
- itens vendidos;
- itens por venda;
- descontos;
- acréscimos.

Criar gráficos:

- faturamento por dia;
- vendas por dia;
- faturamento por loja;
- vendas por vendedor;
- faturamento por vendedor;
- vendas por horário;
- formas de pagamento.

Utilizar o campo de hora existente no XML para criar análise por horário.

---

# 17. TELA DE PRODUTOS / ESTOQUE

Criar tela:

`Produtos / Estoque`

KPIs:

- quantidade de produtos;
- quantidade total em estoque;
- valor do estoque a custo;
- produtos sem estoque;
- produtos com estoque baixo;
- produtos sem venda;
- produtos com estoque parado.

Quando os dados permitirem:

`Valor do estoque = quantidade × preço de custo`

Criar análises:

- Top produtos vendidos;
- produtos sem venda;
- produtos com maior estoque;
- produtos com estoque alto e baixa venda;
- estoque por loja;
- estoque por marca;
- estoque por grupo;
- estoque por família;
- estoque por coleção.

---

# 18. ANÁLISE DE COR E TAMANHO

Como os dados possuem informações de cor e tamanho, criar estrutura preparada para análises como:

- produto x tamanho;
- produto x cor;
- loja x produto;
- loja x tamanho;
- loja x cor.

Objetivo futuro:

Identificar ruptura de determinados tamanhos ou cores.

Exemplo:

Produto X:

36 = 0
37 = 5
38 = 8
39 = 1

Permitir identificar visualmente possíveis rupturas.

---

# 19. MARGEM

Analisar os dados de Produto.xml e VendaItem.xml para determinar a melhor forma de calcular margem.

Quando houver:

`preço de custo`

e

`preço de venda`

calcular:

Custo estimado:

`quantidade × preço de custo`

Margem estimada:

`venda líquida - custo estimado`

Margem %:

`margem estimada / venda líquida × 100`

Se o ERP não fornecer o custo histórico utilizado na venda, identificar claramente a informação como:

`Margem estimada`

Não apresentar margem como valor contábil definitivo.

---

# 20. TELA DE CLIENTES

Criar tela:

`Clientes`

KPIs:

- clientes cadastrados;
- novos clientes no período;
- clientes que compraram;
- clientes sem compra no período;
- ticket médio por cliente.

Criar ranking:

- clientes com maior faturamento;
- clientes com maior quantidade de compras.

---

# 21. COMPARATIVO ENTRE LOJAS

Criar tela:

`Comparativo de Lojas`

Permitir comparar todas as lojas.

Tabela:

- loja;
- faturamento;
- vendas;
- ticket médio;
- itens vendidos;
- desconto;
- margem;
- margem %.

Permitir ordenar por qualquer indicador.

Criar ranking das lojas.

Permitir selecionar duas ou mais lojas para comparação.

---

# 22. REGRAS DE NEGÓCIO

Antes de implementar os cálculos, analisar os XML reais e identificar:

- vendas canceladas;
- itens cancelados;
- devoluções;
- entradas;
- descontos;
- acréscimos;
- promoções;
- fretes;
- formas de pagamento.

Não somar vendas canceladas aos indicadores de vendas válidas.

Não duplicar vendas.

Não duplicar itens.

Registrar as regras de cálculo utilizadas.

---

# 23. MENU

Criar menu lateral:

## Dashboard

- Visão Geral
- Vendas
- Produtos / Estoque
- Clientes
- Comparativo de Lojas

## Administração

- Empresas
- Lojas
- Importações
- Arquivos PBI
- Usuários
- Configurações

Não criar uma tela de configuração de FTP como requisito do usuário final.

A conexão FTP deverá ser tratada pela infraestrutura/serviço de integração.

---

# 24. EXPERIÊNCIA DO USUÁRIO

O sistema deve possuir aparência profissional de software gerencial.

Priorizar:

- visual limpo;
- leitura rápida;
- cards de KPI;
- gráficos claros;
- tabelas;
- filtros;
- responsividade;
- boa utilização em desktop;
- possibilidade futura de utilização em TV.

A primeira tela deve permitir ao gestor compreender a situação da empresa em poucos segundos.

Evitar excesso de informações.

Os indicadores mais importantes devem possuir destaque visual.

---

# 25. SEGURANÇA

Implementar:

- autenticação;
- autorização;
- controle de acesso por empresa;
- controle de acesso por loja;
- proteção das credenciais utilizadas pelo serviço FTP;
- logs;
- isolamento de dados.

Um usuário de uma empresa nunca poderá visualizar dados de outra empresa.

Caso um usuário tenha acesso somente a determinadas lojas, deverá visualizar somente essas lojas.

---

# 26. PERFORMANCE

O Dashboard deverá consultar o banco de dados.

Não realizar leitura dos XML a cada abertura da tela.

Não realizar download do FTP para cada consulta.

Utilizar banco de dados e índices adequados.

Caso necessário, criar tabelas ou estruturas de consolidação para os principais indicadores.

O sistema deverá estar preparado para:

- várias empresas;
- várias lojas;
- grande volume de vendas;
- grande volume de XML;
- histórico de vários anos.

---

# 27. MONITORAMENTO DA IMPORTAÇÃO

Criar uma área:

`Arquivos PBI`

Mostrar:

- nome do arquivo;
- CNPJ;
- loja;
- empresa;
- data do PBI;
- hora do PBI;
- tamanho;
- status;
- data de processamento;
- quantidade de registros;
- erro, se houver.

Permitir filtrar por:

- empresa;
- loja;
- período;
- status.

Criar também:

`Importações`

para visualizar o histórico geral dos processos.

---

# 28. TRATAMENTO DE ERROS

Criar tratamento para:

- FTP indisponível;
- arquivo ZIP corrompido;
- arquivo PBI inválido;
- CNPJ não cadastrado;
- XML inválido;
- XML ausente;
- estrutura inesperada;
- erro de banco;
- arquivo duplicado.

Nenhum erro de importação deverá interromper o processamento dos demais arquivos válidos.

Exemplo:

Se existem 10 arquivos no FTP e 1 está corrompido:

- processar os 9 válidos;
- registrar o arquivo corrompido como erro;
- permitir reprocessamento posteriormente.

---

# 29. PROCESSAMENTO DO FTP

Criar serviço responsável pela sincronização.

Fluxo:

```text
FTP
 ↓
Listar arquivos .zip
 ↓
Validar padrão PBI_<CNPJ>_<AAAAMMDD>_<HHMMSS>.zip
 ↓
Extrair CNPJ
 ↓
Localizar loja
 ↓
Verificar se já foi processado
 ↓
Baixar arquivo
 ↓
Descompactar
 ↓
Validar XML
 ↓
Processar
 ↓
Gravar no banco
 ↓
Registrar sucesso
```

O processo deverá ser executável automaticamente.

A frequência deverá ser configurável pela infraestrutura.

---

# 30. DETECÇÃO DE FECHAMENTO

Como o PBI é enviado ao FTP após o fechamento da loja, utilizar o arquivo mais recente da loja para determinar a última atualização recebida.

Não presumir que a loja fechou somente porque existe um arquivo antigo.

O Dashboard deverá mostrar claramente a idade da última atualização.

Exemplo:

`Última atualização: hoje às 21:45`

ou:

`Última atualização: ontem às 21:32`

---

# 31. FASES DE IMPLEMENTAÇÃO

Executar o projeto nesta ordem.

## FASE 1 — ANÁLISE DOS DADOS

Antes de criar o Dashboard:

- analisar PBI.zip;
- descompactar;
- analisar todos os XML;
- documentar campos;
- identificar chaves;
- identificar relacionamentos;
- identificar regras de negócio;
- identificar campos de data;
- identificar campos monetários;
- identificar campos de quantidade.

Entregar documentação da estrutura encontrada.

---

## FASE 2 — MODELAGEM

Criar modelo do banco.

Definir:

- tabelas;
- relacionamentos;
- índices;
- chaves;
- regras de integridade.

---

## FASE 3 — IMPORTADOR PBI

Implementar:

- conexão FTP;
- leitura dos arquivos;
- identificação pelo nome;
- extração do CNPJ;
- identificação da loja;
- download;
- descompactação;
- validação;
- processamento;
- logs;
- controle de duplicidade.

---

## FASE 4 — DASHBOARD VISÃO GERAL

Implementar:

- filtros;
- KPIs;
- comparação com período anterior;
- gráficos;
- status das lojas;
- última atualização.

---

## FASE 5 — VENDAS

Implementar:

- KPIs;
- gráficos;
- vendedores;
- horários;
- formas de pagamento;
- comparação de períodos.

---

## FASE 6 — PRODUTOS / ESTOQUE

Implementar:

- estoque;
- custo;
- margem estimada;
- produtos vendidos;
- produtos parados;
- cor;
- tamanho;
- loja.

---

## FASE 7 — CLIENTES

Implementar:

- clientes;
- novos clientes;
- clientes compradores;
- ranking;
- ticket por cliente.

---

## FASE 8 — COMPARATIVO DE LOJAS

Implementar:

- ranking;
- comparação;
- indicadores por loja.

---

## FASE 9 — TESTES

Criar testes para:

### FTP

- conexão;
- arquivo válido;
- arquivo inválido;
- arquivo duplicado;
- arquivo corrompido.

### Identificação

- CNPJ válido;
- CNPJ não cadastrado;
- CNPJ pertencente à empresa correta.

### Importação

- XML válido;
- XML inválido;
- ZIP corrompido;
- ausência de XML;
- duplicidade.

### Dashboard

- hoje;
- últimos 3 dias;
- últimos 7 dias;
- este mês;
- mês anterior;
- período personalizado.

### Multiempresa

Garantir que dados de empresas diferentes nunca sejam misturados.

### Multiloja

Garantir que:

`Todas as lojas`

mostre o consolidado correto.

E:

`Loja X`

mostre somente os dados daquela loja.

---

# 32. DOCUMENTAÇÃO

Ao final, gerar documentação contendo:

- arquitetura;
- estrutura do banco;
- estrutura dos XML;
- relacionamento dos dados;
- regras de cálculo;
- funcionamento do importador;
- padrão dos arquivos PBI;
- processo de identificação por CNPJ;
- configuração da infraestrutura FTP;
- instalação;
- execução;
- manutenção;
- solução de problemas.

---

# 33. PREPARAÇÃO PARA FUTURAS FUNCIONALIDADES

A arquitetura deverá permitir futuramente implementar:

- metas de vendas;
- metas por loja;
- metas por vendedor;
- alertas;
- notificações;
- ranking de lojas;
- previsão de faturamento;
- inteligência comercial;
- curva ABC;
- análise de produtos parados;
- análise de ruptura;
- dashboard para TV;
- aplicativo mobile;
- indicadores financeiros.

Não implementar essas funcionalidades agora, apenas preparar a arquitetura para que possam ser adicionadas posteriormente.

---

# 34. RESULTADO FINAL ESPERADO

O sistema deverá permitir que o gestor responda rapidamente:

- Quanto vendemos?
- Quanto vendemos hoje?
- Estamos vendendo mais ou menos que o período anterior?
- Qual loja vende mais?
- Qual loja vende menos?
- Qual vendedor vende mais?
- Qual é o ticket médio?
- Quantos itens estamos vendendo?
- Quais produtos vendem mais?
- Quais produtos estão parados?
- Quanto temos em estoque?
- Qual é a margem estimada?
- Quais formas de pagamento são mais utilizadas?
- Quais clientes mais compram?
- Qual loja ainda não atualizou?
- Quando cada loja enviou o último PBI?

O sistema deve priorizar:

**simplicidade + velocidade de leitura + confiabilidade dos dados + visão gerencial.**

Não criar apenas uma coleção de relatórios.

O objetivo é criar um verdadeiro **Dashboard Gerencial Multilojas**, no qual o gestor consiga entender a situação da empresa rapidamente.

---

# 35. REGRA PRINCIPAL DE DESENVOLVIMENTO

NÃO começar criando as telas.

Primeiro:

1. analisar o PBI_39310768000105_20260626_141555.zip;
2. documentar os XML;
3. identificar relacionamentos;
4. definir as regras de negócio;
5. definir o modelo de banco;
6. implementar o importador;
7. testar a importação;
8. validar os dados;
9. somente depois criar os dashboards.

Utilizar os arquivos reais fornecidos no projeto como fonte principal para entender a estrutura dos dados.

Quando houver uma dúvida sobre a estrutura ou regra de negócio, não inventar silenciosamente.

Registrar a dúvida e, quando possível, implementar a regra de forma configurável.

O resultado deve ser uma aplicação funcional, organizada, escalável e preparada para operação com múltiplas empresas e múltiplas lojas.