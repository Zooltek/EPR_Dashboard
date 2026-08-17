# 📊 Dashboard Gerencial Multilojas EPR

Sistema moderno de inteligência de negócios (BI) e Dashboard Gerencial Web integrado automaticamente ao ERP via sincronização FTP e ingestão de pacotes PBI XML/ZIP.

---

## 🚀 Tecnologias

- **Frontend**: React, TypeScript, Vite, ApexCharts, Lucide Icons, CSS3 Variables (Tema Claro / Escuro dinâmico).
- **Backend**: Node.js, Express, TypeScript, SQLite (`better-sqlite3`), `basic-ftp`, `fast-xml-parser`, `jszip`.
- **Sincronização**: Cron Job automatizado para monitoramento e download contínuo de arquivos PBI no servidor FTP.

---

## 📦 Estrutura do Projeto

```
EPR_Dashboard/
├── client/                 # Frontend React + Vite
│   ├── public/             # Assets públicos e logos
│   └── src/
│       ├── components/     # Sidebar, Header e Navegação
│       ├── pages/          # Visão Geral, Vendas, Produtos, Clientes, Comparativo de Lojas, Arquivos PBI, Lojas
│       └── types/          # Interfaces TypeScript
├── server/                 # Backend Node.js + Express
│   ├── src/
│   │   ├── db/             # Conexão e Schema SQLite
│   │   ├── routes/         # Rotas da API (Dashboard e Admin)
│   │   └── services/       # Importador PBI, FTP Sync e Cron
│   └── .env.example        # Exemplo de variáveis de ambiente
└── README.md
```

---

## 🛠️ Como Executar Localmente

### 1. Backend

```bash
cd server
npm install
cp .env.example .env   # Ajuste as credenciais do FTP
npm run dev
```
O servidor iniciará em `http://localhost:3001`.

### 2. Frontend

```bash
cd client
npm install
npm run dev
```
Acesse o Dashboard em `http://localhost:5173`.

---

## 🚢 Como Executar em Produção

```bash
# Compilação do Backend
cd server
npm run build

# Compilação do Frontend
cd ../client
npm run build
```

---

## 📄 Licença
Proprietário / Zooltek.
