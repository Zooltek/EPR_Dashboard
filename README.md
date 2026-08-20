# 📊 Amura Dashboard — Inteligência de Negócios & BI Multilojas

Sistema completo de **Inteligência de Negócios (Business Intelligence)** e **Dashboard Gerencial para Varejo**, integrado ao ERP Consuldata / Plenus. O sistema realiza a captura contínua, processamento de pacotes PBI, consolidação de métricas comerciais e visualização analítica de vendas, metas, estoque, vendedores e clientes, operando em três modalidades:

1. **💻 Aplicativo Desktop Windows** (Instalador NSIS ou Versão Portátil 100% offline).
2. **🏢 Servidor Web Local** (Execução na rede interna da loja com acesso por múltiplos dispositivos via Wi-Fi/IP).
3. **☁️ Nuvem / VPS** (Deploy em container Docker com proxy reverso Nginx e SSL HTTPS).

---

## 📑 Sumário

- [1. Arquitetura e Ingestão de Dados](#1-arquitetura-e-ingestão-de-dados)
- [2. Principais Módulos & Indicadores (KPIs)](#2-principais-módulos--indicadores-kpis)
- [3. 🔨 Como Gerar os Executáveis Windows (Instalador e Portátil)](#3--como-gerar-os-executáveis-windows-instalador-e-portátil)
  - [3.1 Pré-requisitos](#31-pré-requisitos)
  - [3.2 Compilação Geral do Projeto](#32-compilação-geral-do-projeto)
  - [3.3 Gerando o Instalador Windows (.exe / NSIS)](#33-gerando-o-instalador-windows-exe--nsis)
  - [3.4 Gerando a Versão Portátil (Portable / Pendrive)](#34-gerando-a-versão-portátil-portable--pendrive)
  - [3.5 Gerando a Versão em Pasta Descompactada (Unpacked)](#35-gerando-a-versão-em-pasta-descompactada-unpacked)
  - [3.6 Localização dos Dados no Desktop e Desinstalação Limpa](#36-localização-dos-dados-no-desktop-e-desinstalação-limpa)
- [4. Execução Local em Modo Web / Rede da Loja](#4-execução-local-em-modo-web--rede-da-loja)
  - [4.1 Execução Rápida via Script (.bat)](#41-execução-rápida-via-script-bat)
  - [4.2 Execução como Serviço do Windows (Início Automático)](#42-execução-como-serviço-do-windows-início-automático)
  - [4.3 Acesso por Celulares e Tablets na Rede Local](#43-acesso-por-celulares-e-tablets-na-rede-local)
- [5. Deploy em Nuvem / VPS (Docker & Nginx)](#5-deploy-em-nuvem--vps-docker--nginx)
  - [5.1 Passo a Passo com Docker Compose](#51-passo-a-passo-com-docker-compose)
  - [5.2 Configuração de Nginx com SSL Gratuito (Certbot)](#52-configuração-de-nginx-com-ssl-gratuito-certbot)
  - [5.3 Estratégia Multi-Empresas (Containers Isolados)](#53-estratégia-multi-empresas-containers-isolados)
- [6. Configuração e Variáveis de Ambiente (.env & .env.secrets)](#6-configuração-e-variáveis-de-ambiente-env--envsecrets)
- [7. Estrutura do Banco de Dados (SQLite WAL)](#7-estrutura-do-banco-de-dados-sqlite-wal)
- [8. Backup e Restauração](#8-backup-e-restauração)
- [9. Segurança e Boas Práticas](#9-segurança-e-boas-práticas)

---

## 1. Arquitetura e Ingestão de Dados

O ERP exporta periodicamente pacotes no formato padronizado `PBI_<CNPJ>_<AAAAMMDD>_<HHMMSS>.zip`. Cada arquivo contém arquivos XML estruturados com dados de cabeçalho e itens de venda, produtos, vendedores, estoque e clientes.

```
┌─────────────────────────┐       ┌─────────────────────────────────┐       ┌──────────────────────┐
│ ERP Consuldata / Plenus │ ───▶  │ FTP Remoto / Pasta Local / Rede │ ───▶  │  Amura Backend (Node)│
└─────────────────────────┘       └─────────────────────────────────┘       └──────────┬───────────┘
                                                                                       │
                                                ┌──────────────────────────────────────┴──────────────────────────────────────┐
                                                ▼                                                                             ▼
                                     ┌──────────────────────┐                                                      ┌──────────────────────┐
                                     │  SQLite (Modo WAL)   │                                                      │  Frontend (React)    │
                                     │   dashboard.sqlite   │ ◀──────────── [ API REST / Polling ] ────────────────┤  Interface & Gráficos│
                                     └──────────────────────┘                                                      └──────────────────────┘
```

### Origens de Dados Suportadas (Configuráveis pela Interface):
1. **Pasta Local / Compartilhamento de Rede UNC (`LOCAL`)**:
   * Suporta caminhos locais (`C:\Consuldata\PBI`) e caminhos de rede (`\\servidor\compartilhamento\PBI`).
   * **File Watcher em tempo real**: Processa instantaneamente novos arquivos gerados pelo ERP na pasta.
   * **Agendador Periódico em Background**: Varre a pasta no intervalo definido pelo usuário (ex: 5 em 5 minutos).
2. **Servidor FTP Remoto (`FTP`)**:
   * Conecta ao FTP (VixHost, UOLHost ou Customizado), baixa os pacotes pendentes e importa automaticamente.
3. **Modo Híbrido (`AMBOS`)**:
   * Sincroniza tanto arquivos locais quanto remotos via FTP.
4. **Upload Direto de Pacotes**:
   * Área de drag-and-drop na tela *Arquivos PBI* para envio manual de arquivos `.zip`.

---

## 2. Principais Módulos & Indicadores (KPIs)

* **Visão Geral**: Faturamento Líquido, Vendas Brutas, Cancelamentos, Devoluções/Trocas, Descontos Concedidos, Ticket Médio, Peças por Atendimento (PA) e Comparativo com Dias/Meses Anteriores.
* **Desempenho de Vendas**: Curva ABC de produtos mais vendidos, horários de pico, análise por vendedor e distribuição de meios de pagamento.
* **Produtos & Estoque**:
  * **Capital Investido**: Valor total do estoque a preço de custo ($\sum Qtd \times Custo$).
  * **Potencial de Faturamento**: Valor total do estoque a preço de venda ($\sum Qtd \times Venda$).
  * **Lucro Bruto Potencial**: Projeção de lucro caso o estoque seja 100% comercializado ($Potencial - Investido$).
  * **Estoque Parado — Top 10**: Gráfico de barras horizontais com seletor dinâmico de período (**30, 60, 90 ou 180 dias sem venda**), identificando onde o capital está imobilizado.
* **Base de Clientes**: Aniversariantes do mês (com visualização dos próximos dias e filtros) e Ranking dos Melhores Clientes.
* **Comparativo de Lojas**: Matriz comparativa entre filiais, ranking de faturamento, share de vendas e ticket médio.
* **Auditoria de Arquivos PBI**: Histórico detalhado de processamento de cargas, integridade de arquivos e status por filial.
* **Manual do Usuário Integrado**: Modal explicativo completo acessível via tecla **`F1`** ou menu lateral, com opção de download de PDF oficial com diagramação executiva.

---

## 3. 🔨 Como Gerar os Executáveis Windows (Instalador e Portátil)

O projeto está totalmente configurado para geração de executáveis desktop profissionais utilizando **Electron** e **Electron Builder**.

### 3.1 Pré-requisitos
* **Node.js**: Versão 18, 20 ou 22 LTS instalada ([Download](https://nodejs.org/)).
* **Git**: Instalado no ambiente Windows.
* **PowerShell** ou **Prompt de Comando**.

---

### 3.2 Compilação Geral do Projeto

Antes de gerar qualquer executável, compile os pacotes do frontend e backend:

```powershell
# Instala as dependências na raiz, client e server (se necessário)
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# Compila o frontend React (Vite) e o backend Node (TypeScript)
npm run build:all
```

---

### 3.3 Gerando o Instalador Windows (.exe / NSIS)

O instalador cria atalhos no Menu Iniciar e na Área de Trabalho, permite escolher o diretório de instalação e possui desinstalador inteligente.

```powershell
# Executa a compilação completa e gera o instalador NSIS x64
npm run dist:installer
```
*(ou execute diretamente `npx electron-builder --win nsis --x64`)*

📍 **Arquivo Gerado:**
```
dist-electron/Amura Dashboard Setup 1.0.0.exe
```

---

### 3.4 Gerando a Versão Portátil (Portable / Pendrive)

A versão portátil é um único arquivo executável autônomo que pode ser executado diretamente de um pendrive ou pasta sem necessidade de instalação no Windows.

```powershell
# Gera o executável portátil autônomo (.exe)
npm run dist:portable
```
*(ou execute diretamente `npx electron-builder --win portable --x64`)*

📍 **Arquivo Gerado:**
```
dist-electron/Amura Dashboard 1.0.0.exe
```

---

### 3.5 Gerando a Versão em Pasta Descompactada (Unpacked)

Para testar ou distribuir como uma pasta compactada (`.zip`), onde o cliente apenas extrai e clica em `Amura Dashboard.exe`:

```powershell
# Gera a pasta com todos os binários prontos para execução direta
npm run dist:unpacked
```
*(ou execute diretamente `npx electron-builder --win --dir --x64`)*

📍 **Pasta Gerada:**
```
dist-electron/win-unpacked/
  ├── Amura Dashboard.exe
  ├── resources/
  └── ...
```

---

### 3.6 Localização dos Dados no Desktop e Desinstalação Limpa

* **Armazenamento do Banco SQLite no Desktop**:
  * O banco de dados e os logs são salvos de forma persistente no diretório de dados do usuário:
    ```
    %APPDATA%\Amura Dashboard\data\dashboard.sqlite
    ```
* **Desinstalação Limpa**:
  * O instalador NSIS inclui um script de desinstalação customizado (`desktop/installer.nsh`) que remove automaticamente todas as pastas residuais em `%APPDATA%` e `%LOCALAPPDATA%`, garantindo que nenhuma pasta fique para trás ao desinstalar pelo *Painel de Controle / Configurações do Windows*.

---

## 4. Execução Local em Modo Web / Rede da Loja

Ideal para rodar no servidor da loja sem empacotamento Electron, disponibilizando o painel via navegador para outros computadores da rede interna.

### 4.1 Execução Rápida via Script (.bat)

1. Crie o arquivo `.env` dentro da pasta `server/`:
   ```env
   PORT=3001
   NODE_ENV=production
   LOCAL_PBI_DIR="C:/Consuldata/PBI"
   SYNC_INTERVAL_MINUTES=5
   ```
2. Dê um duplo clique no arquivo:
   ```cmd
   iniciar_dashboard_windows.bat
   ```
3. Acesse no navegador: `http://localhost:3001`.

---

### 4.2 Execução como Serviço do Windows (Início Automático)

Para manter o dashboard rodando em segundo plano mesmo sem usuário logado:

#### Com NSSM (Recomendado):
1. Baixe o [NSSM](https://nssm.cc/download).
2. Execute no prompt como Administrador:
   ```cmd
   nssm install AmuraDashboard
   ```
3. Configure:
   * **Path**: `C:\Program Files\nodejs\node.exe`
   * **Startup directory**: `C:\Projetos\EPR_Dashboard\server`
   * **Arguments**: `dist/index.js`
4. Clique em **Install service** e inicie o serviço.

---

### 4.3 Acesso por Celulares e Tablets na Rede Local

1. Descubra o IP do servidor rodando `ipconfig` no prompt (ex: `192.168.1.100`).
2. Libere a porta `3001` no Firewall do Windows:
   ```powershell
   New-NetFirewallRule -DisplayName "Amura Dashboard" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
   ```
3. Acesse em qualquer smartphone, tablet ou notebook conectado ao Wi-Fi da loja: `http://192.168.1.100:3001`.

---

## 5. Deploy em Nuvem / VPS (Docker & Nginx)

### 5.1 Passo a Passo com Docker Compose

1. **Acesse a VPS (Ubuntu/Debian) e instale o Docker**:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
2. **Clone o repositório**:
   ```bash
   git clone https://github.com/Zooltek/EPR_Dashboard.git /opt/epr-dashboard
   cd /opt/epr-dashboard
   ```
3. **Configure as variáveis de ambiente em `.env.secrets`**:
   ```bash
   nano .env.secrets
   ```
4. **Inicie o container**:
   ```bash
   docker compose down
   docker compose up -d --build
   ```

---

### 5.2 Configuração de Nginx com SSL Gratuito (Certbot)

```nginx
server {
    server_name dashboard.suaempresa.com.br;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 100M;
    }
}
```

Para ativar o SSL automático:
```bash
sudo certbot --nginx -d dashboard.suaempresa.com.br
```

---

### 5.3 Estratégia Multi-Empresas (Containers Isolados)

Para atender clientes distintos na mesma VPS mantendo bancos e senhas 100% isolados, utilize instâncias separadas por container:

```yaml
version: '3.8'

services:
  app-cliente1:
    build: .
    container_name: epr_cliente1
    restart: unless-stopped
    ports:
      - "3001:3001"
    volumes:
      - ./data/cliente1:/app/server/data
      - ./downloads/cliente1:/app/server/downloads

  app-cliente2:
    build: .
    container_name: epr_cliente2
    restart: unless-stopped
    ports:
      - "3002:3001"
    volumes:
      - ./data/cliente2:/app/server/data
      - ./downloads/cliente2:/app/server/downloads
```

---

## 6. Configuração e Variáveis de Ambiente (.env & .env.secrets)

| Variável | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `PORT` | Número | `3001` | Porta HTTP do servidor web |
| `NODE_ENV` | Texto | `production` | Modo de execução (`development` ou `production`) |
| `LOCAL_PBI_DIR` | Caminho | `./PBI` | Pasta padrão para leitura de pacotes PBI |
| `FTP_HOST` | Host | `ftp.consuldatasistemas.com.br` | Endereço do servidor FTP |
| `FTP_PORT` | Número | `21` | Porta FTP |
| `FTP_USER` | Texto | `consuldata` | Usuário FTP |
| `FTP_PASSWORD` | Texto | - | Senha FTP (armazenar em `.env.secrets`) |
| `SYNC_INTERVAL_MINUTES`| Número | `5` | Intervalo padrão do agendador em minutos |

---

## 7. Estrutura do Banco de Dados (SQLite WAL)

O sistema utiliza **SQLite** em modo **WAL (Write-Ahead Logging)** para máxima velocidade de leitura simultânea.

* `empresa` — Cadastro de empresas matrizes.
* `loja` — Filiais vinculadas à empresa com seus respectivos CNPJs e IDs do ERP.
* `configuracao_sync` — Configurações ativas de sincronização (FTP, Pasta Local, Intervalos).
* `pbi_arquivo` — Log de auditoria e idempotência de pacotes importados.
* `produto`, `marca`, `grupo`, `familia`, `colecao`, `cor`, `tamanho` — Catálogo de mercadorias.
* `estoque` — Posição de estoque por loja, referência, cor e tamanho.
* `venda_cab` & `venda_item` — Cabeçalho e itens detalhados de cupons fiscais e vendas.
* `vendedor` & `cliente` — Equipe comercial e base de consumidores.

---

## 8. Backup e Restauração

1. **Pela Interface Web / Menu do Sistema**:
   * Acesse *Lojas & Configurações* e clique no botão **Fazer Backup dos Dados** para baixar o arquivo `.sqlite`.
2. **Pelo Aplicativo Desktop**:
   * Acesse o menu superior *Arquivo > Fazer Backup dos Dados (.sqlite)*.
3. **Em Servidor Linux / Docker**:
   ```bash
   # Sincroniza o WAL e gera uma cópia do banco
   docker exec epr_dashboard_app node -e "const Database = require('better-sqlite3'); const db = new Database('/app/server/data/dashboard.sqlite'); db.pragma('wal_checkpoint(TRUNCATE)');"
   cp data/dashboard.sqlite data/backup_$(date +%Y%m%d_%H%M%S).sqlite
   ```

---

## 9. Segurança e Boas Práticas

* **Sem Credenciais Hard-Coded**: Segredos são carregados exclusivamente de variáveis de ambiente e `.env.secrets` (ignorado pelo Git).
* **Proteção contra Path Traversal**: Validação estrita de nomes de arquivos ZIP e caminhos relativos.
* **Salvaguardas de Integridade Referencial**: Auto-cadastramento seguro de matriz e filiais para evitar violações de chave estrangeira em cargas parciais.
* **Permissões Mínimas no Docker**: O container roda sob o usuário sem privilégios administrativos `USER node`.

---

## 📄 Licença
Proprietário / **Fabricio**. Todos os direitos reservados.
