# 📊 Amura Dashboard — Inteligência de Negócios & BI Multilojas

Sistema completo de inteligência de negócios (Business Intelligence) e Dashboard Gerencial Web integrado ao ERP. O sistema realiza a captura contínua, processamento inteligente e consolidação visual de vendas, metas, estoque, vendedores e clientes, operando de forma **100% local (offline)** ou em **nuvem (VPS com Docker)**.

---

## 📑 Sumário

- [1. Arquitetura e Funcionamento](#1-arquitetura-e-funcionamento)
- [2. Métodos de Ingestão de Dados](#2-métodos-de-ingestão-de-dados)
- [3. Instalação Local no Cliente (Windows / Rede Local)](#3-instalação-local-no-cliente-windows--rede-local)
  - [3.1 Execução Rápida via Script (.bat)](#31-execução-rápida-via-script-bat)
  - [3.2 Configuração como Serviço do Windows (Início Automático com o SO)](#32-configuração-como-serviço-do-windows-início-automático-com-o-so)
  - [3.3 Acesso por Outros Dispositivos na Rede Local](#33-acesso-por-outros-dispositivos-na-rede-local)
- [4. Instalação em Nuvem / VPS (Docker & Nginx)](#4-instalação-em-nuvem--vps-docker--nginx)
  - [4.1 Passo a Passo com Docker](#41-passo-a-passo-com-docker)
  - [4.2 Configuração de Nginx com SSL (HTTPS)](#42-configuração-de-nginx-com-ssl-https)
- [5. Estratégia Multi-Empresas (Atendendo Vários Clientes)](#5-estratégia-multi-empresas-atendendo-vários-clientes)
  - [5.1 Cenário A: Uma Empresa com Múltiplas Filiais/Lojas](#51-cenário-a-uma-empresa-com-múltiplas-filiaislojas)
  - [5.2 Cenário B: Múltiplas Empresas Independentes (Isolamento por Container)](#52-cenário-b-múltiplas-empresas-independentes-isolamento-por-container)
- [6. Variáveis de Ambiente (.env)](#6-variáveis-de-ambiente-env)
- [7. Estrutura do Banco de Dados (SQLite)](#7-estrutura-do-banco-de-dados-sqlite)
- [8. Backup, Manutenção e Troubleshooting](#8-backup-manutenção-e-troubleshooting)

---

## 1. Arquitetura e Funcionamento

O ERP exporta periodicamente pacotes no formato `PBI_<CNPJ>_<AAAAMMDD>_<HHMMSS>.zip`. Cada arquivo ZIP contém arquivos XML com tabelas de cabeçalho e itens de venda, produtos, vendedores, estoque e clientes.

```
┌─────────────────┐       ┌────────────────────────┐       ┌──────────────────────┐
│  ERP/Consuldata │ ───▶  │ Pasta Local / Serv. FTP │ ───▶  │  EPR Backend (Node)  │
└─────────────────┘       └────────────────────────┘       └──────────┬───────────┘
                                                                      │
                                        ┌─────────────────────────────┴─────────────────────────────┐
                                        ▼                                                           ▼
                             ┌──────────────────────┐                                    ┌──────────────────────┐
                             │ Banco SQLite (WAL)   │                                    │  Frontend (React+Vite│
                             │ dashboard.sqlite     │ ◀─── [ API REST / Dashboard ] ──── │  Métricas e Gráficos │
                             └──────────────────────┘                                    └──────────────────────┘
```

### Tecnologias Utilizadas:
* **Frontend**: React 18, TypeScript, Vite, Tailwind-compatible CSS Variables, ApexCharts, Lucide Icons.
* **Backend**: Node.js, Express, TypeScript, SQLite (`better-sqlite3` com WAL mode ativado para alta performance de leitura).
* **Ingestão**: `jszip`, `fast-xml-parser`, `basic-ftp`, `fs.watch` com debounce em tempo real.
* **Deploy**: Docker Multi-stage, Docker Compose, Windows Service (NSSM/PM2).

---

## 2. Métodos de Ingestão de Dados

O backend suporta **três métodos** simultâneos de ingestão de arquivos:

1. **Pasta Local / Compartilhamento de Rede (`LOCAL_PBI_DIR`)**:
   * O sistema monitora a pasta via **File Watcher em tempo real**. Assim que o ERP gera o `.zip`, o arquivo é lido e importado instantaneamente.
   * Possui agendador periódico (`SYNC_INTERVAL_MINUTES=5`) para varreduras de redundância.
2. **Servidor FTP Remoto (`FTP_HOST`)**:
   * Conecta ao FTP da Consuldata/cliente, baixa os arquivos novos para `downloads/` e processa.
3. **Upload Manual pelo Painel**:
   * Tela administrativa com funcionalidade drag-and-drop para envio manual de arquivos `.zip`.

> **Garantia de Idempotência**: O sistema registra cada arquivo importado na tabela `pbi_arquivo`. Arquivos já processados não são reprocessados, evitando duplicidade de vendas.

---

## 3. Instalação Local no Cliente (Windows / Rede Local)

Ideal para clientes que desejam rodar o dashboard no próprio servidor local ou na máquina do caixa/gerência, sem custos de VPS e com 100% de privacidade (dados nunca saem da loja).

### 3.1 Execução Rápida via Script (.bat)

1. Instale o [Node.js (versão 18 ou superior)](https://nodejs.org/).
2. Clone ou descompacte o projeto em uma pasta (ex: `C:\EPR_Dashboard`).
3. Crie o arquivo `.env` dentro da pasta `server` com base no `.env.example`:
   ```env
   PORT=3001
   NODE_ENV=production
   LOCAL_PBI_DIR="C:/Consuldata/PBI"
   SYNC_INTERVAL_MINUTES=5
   ```
4. Dê um **duplo clique** no arquivo:
   ```
   iniciar_dashboard_windows.bat
   ```
5. O painel estará acessível no navegador em: `http://localhost:3001`.

---

### 3.2 Configuração como Serviço do Windows (Início Automático com o SO)

Para garantir que o dashboard continue rodando mesmo após reiniciar o computador ou sem nenhum usuário logado:

#### Método com PM2:
1. Abra o Terminal/PowerShell como Administrador e instale o PM2:
   ```powershell
   npm install -g pm2 pm2-windows-service
   pm2-service-install -n "EPR_Dashboard"
   ```
2. Inicie a aplicação no PM2:
   ```powershell
   cd C:\EPR_Dashboard\server
   pm2 start dist/index.js --name "epr-dashboard"
   pm2 save
   ```

#### Método com NSSM (Non-Sucking Service Manager):
1. Baixe o [NSSM](https://nssm.cc/download).
2. Abra o Prompt de Comando como Administrador e execute:
   ```cmd
   nssm install EPRDashboard
   ```
3. No formulário que abrir:
   * **Path**: `C:\Program Files\nodejs\node.exe`
   * **Startup directory**: `C:\EPR_Dashboard\server`
   * **Arguments**: `dist/index.js`
4. Clique em **Install service** e depois inicie o serviço no `services.msc` do Windows.

---

### 3.3 Acesso por Outros Dispositivos na Rede Local

Para que gerentes e diretores acessem de seus celulares, notebooks ou tablets na mesma rede Wi-Fi/cabeada da loja:

1. Descubra o IP local do servidor executando `ipconfig` no prompt (ex: `192.168.1.50`).
2. Abra a porta `3001` no Firewall do Windows:
   ```powershell
   New-NetFirewallRule -DisplayName "EPR Dashboard" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
   ```
3. Acesse de qualquer aparelho na rede: `http://192.168.1.50:3001`.

---

## 4. Instalação em Nuvem / VPS (Docker & Nginx)

Ideal para centralizar o dashboard em uma VPS (Ubuntu/Debian na Hostinger, DigitalOcean, AWS, Hetzner, etc.) acessível pela internet com domínio próprio e SSL gratuito.

### 4.1 Passo a Passo com Docker

1. **Conecte-se na VPS e instale o Docker e Docker Compose**:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

2. **Clone o repositório**:
   ```bash
   git clone https://github.com/Zooltek/EPR_Dashboard.git /opt/epr-dashboard
   cd /opt/epr-dashboard
   ```

3. **Crie o arquivo `.env` de produção**:
   ```bash
   cp .env.example .env
   nano .env
   ```
   Preencha as credenciais de FTP do cliente:
   ```env
   PORT=3001
   NODE_ENV=production
   FTP_HOST=ftp.consuldatasistemas.com.br
   FTP_PORT=21
   FTP_USER=consuldata_cliente1
   FTP_PASSWORD="sua_senha_segura"
   FTP_DIR=clientes/cliente1
   SYNC_INTERVAL_MINUTES=5
   ```

4. **Suba o container com Docker Compose**:
   ```bash
   docker compose up -d --build
   ```

5. **Verifique os logs de sincronização**:
   ```bash
   docker compose logs -f
   ```

---

### 4.2 Configuração de Nginx com SSL (HTTPS)

Para disponibilizar sob um domínio com certificado SSL gratuito via Let's Encrypt:

1. **Instale o Nginx e o Certbot**:
   ```bash
   sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
   ```

2. **Crie a configuração do site**:
   ```bash
   sudo nano /etc/nginx/sites-available/dashboard-cliente1.conf
   ```
   Conteúdo:
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
           proxy_cache_bypass $http_upgrade;
           client_max_body_size 100M;
       }
   }
   ```

3. **Ative o site e gere o certificado SSL**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/dashboard-cliente1.conf /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d dashboard.suaempresa.com.br
   ```

---

## 5. Estratégia Multi-Empresas (Atendendo Vários Clientes)

### 5.1 Cenário A: Uma Empresa com Múltiplas Filiais/Lojas
O sistema já suporta **nativamente** redes com 1 matriz e dezenas de filiais. O parser identifica o CNPJ de cada loja no nome do arquivo ZIP (`PBI_<CNPJ>_...zip`) e vincula à empresa cadastrada, permitindo:
* Filtrar métricas por loja individual ou visão consolidada de toda a rede.
* Comparativo de faturamento entre lojas, metas e ticket médio.

---

### 5.2 Cenário B: Múltiplas Empresas Independentes (Isolamento por Container)

Quando você atende **clientes diferentes** (ex: Loja de Calçados A e Loja de Roupas B), a melhor prática de segurança e LGPD é utilizar **containers independentes**. Cada cliente terá seu próprio banco de dados SQLite, suas próprias credenciais e sua própria porta/subdomínio.

#### Estrutura de Diretórios na VPS:
```text
/opt/
  ├── cliente-amura/
  │   ├── .env (FTP da Amura, Porta 3001)
  │   └── data/dashboard.sqlite
  ├── cliente-fiodeouro/
  │   ├── .env (FTP da Fio de Ouro, Porta 3002)
  │   └── data/dashboard.sqlite
  └── docker-compose.yml (Orquestra todos)
```

#### Exemplo de `docker-compose.yml` Multi-Cliente:
```yaml
version: '3.8'

services:
  app-amura:
    build: .
    container_name: epr-amura
    restart: unless-stopped
    env_file: ./clientes/amura.env
    ports:
      - "3001:3001"
    volumes:
      - ./data/amura:/app/server/data
      - ./downloads/amura:/app/server/downloads

  app-fiodeouro:
    build: .
    container_name: epr-fiodeouro
    restart: unless-stopped
    env_file: ./clientes/fiodeouro.env
    ports:
      - "3002:3001"
    volumes:
      - ./data/fiodeouro:/app/server/data
      - ./downloads/fiodeouro:/app/server/downloads
```

#### Roteamento Nginx:
* `amura.seudash.com.br` ──▶ encaminha para `http://127.0.0.1:3001`
* `fiodeouro.seudash.com.br` ──▶ encaminha para `http://127.0.0.1:3002`

#### ✅ Vantagens do Isolamento:
1. **Segurança Máxima**: Risco zero de vazamento de dados de faturamento entre empresas.
2. **Resiliência**: Se o FTP de um cliente cair ou houver erro em arquivo de um cliente, os demais continuam funcionando perfeitamente.
3. **Backups Isolados**: O banco `dashboard.sqlite` de cada cliente pode ser restaurado ou copiado individualmente.

---

## 6. Variáveis de Ambiente (.env & .env.secrets)

Copie o arquivo `.env.example` para `.env` ou crie `.env.secrets` para armazenar credenciais sensíveis:

| Variável | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- |
| `PORT` | Número | `3001` | Porta HTTP em que o servidor irá responder |
| `NODE_ENV` | Texto | `production` | Ambiente (`development` ou `production`) |
| `LOCAL_PBI_DIR` | Caminho | `./PBI` | Pasta local monitorada para busca de arquivos `.zip` |
| `FTP_VIXHOST_HOST` | Host | `ftp.consuldatasistemas.com.br` | Host do provedor FTP VixHost |
| `FTP_VIXHOST_PORT` | Número | `21` | Porta do servidor VixHost |
| `FTP_VIXHOST_USER` | Texto | `consuldata` | Usuário do provedor VixHost |
| `FTP_VIXHOST_PASSWORD`| Texto | - | Senha do FTP VixHost (guardar em `.env.secrets`) |
| `FTP_UOLHOST_HOST` | Host | `ftp.sistemaplenus.com.br` | Host do provedor FTP UOLHost |
| `FTP_UOLHOST_PORT` | Número | `21` | Porta do servidor UOLHost |
| `FTP_UOLHOST_USER` | Texto | `sistemaplenus` | Usuário do provedor UOLHost |
| `FTP_UOLHOST_PASSWORD`| Texto | - | Senha do FTP UOLHost (guardar em `.env.secrets`) |

---

## 7. 🔒 Segurança & Boas Práticas

### Gerenciamento de Credenciais
* **Sem Credenciais no Código**: Nenhuma senha ou segredo é versionado no repositório Git.
* **Arquivo `.env.secrets`**: Utilize `.env.secrets` para armazenar senhas em produção. Este arquivo é automaticamente ignorado pelo `.gitignore` e carregado com prioridade máxima pelo backend.
* **Rotação de Senhas**: Para alterar senhas de FTP, basta atualizar a variável de ambiente correspondente ou reconfigurar através da interface em *Lojas & Configurações*.

### Auditoria de Dependências
Para verificar a segurança de dependências em produção:
```bash
# Executa auditoria estrita em dependências de produção
npm audit --omit=dev
```

### Execução em Container Hardened
* O container Docker roda sob o usuário sem privilégios administrativos `USER node`.
* Acesso restrito aos diretórios `/app/server/data` e `/app/server/downloads`.

---

## 8. 🧪 Testes Automatizados

O backend possui suíte completa de testes unitários e de integração utilizando **Vitest**:
```bash
# Executar todos os testes automatizados
npm --prefix server test
```
* Cobertura de validação de nomenclatura e integridade de ZIPs PBI.
* Teste de resiliência a arquivos corrompidos ou maliciosos (Path Traversal).
* Teste de configurações e provedores FTP dinâmicos.

---

## 9. Backup, Manutenção e Restauração

### Como Fazer Backup do Banco de Dados
Existem 3 formas simples de realizar cópias de segurança:
1. **Via Painel Web**: Acesse *Lojas & Configurações* e clique no botão **Fazer Backup dos Dados** para baixar o `.sqlite` completo.
2. **Via Aplicativo Desktop**: Acesse o menu superior *Arquivo > Fazer Backup dos Dados (.sqlite)*.
3. **Via Linha de Comando / Docker**:
   ```bash
   # Cópia segura do SQLite com checkpoint WAL sincronizado
   docker exec epr_dashboard_app node -e "const Database = require('better-sqlite3'); const db = new Database('/app/server/data/dashboard.sqlite'); db.pragma('wal_checkpoint(TRUNCATE)');"
   cp data/dashboard.sqlite data/backup_$(date +%Y%m%d).sqlite
   ```

---

## 📄 Licença
Proprietário / **Fabricio**. Todos os direitos reservados.
