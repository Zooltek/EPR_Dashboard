# 📊 Dashboard Gerencial Multilojas EPR

Sistema moderno de inteligência de negócios (BI) e Dashboard Gerencial Web integrado automaticamente ao ERP via sincronização FTP e ingestão de pacotes PBI XML/ZIP.

---

## 🚀 Tecnologias

- **Frontend**: React, TypeScript, Vite, ApexCharts, Lucide Icons, CSS3 Variables (Tema Claro / Escuro dinâmico).
- **Backend**: Node.js, Express, TypeScript, SQLite (`better-sqlite3`), `basic-ftp`, `fast-xml-parser`, `jszip`.
- **Deploy & Conteinerização**: Docker Multi-Stage Build, Docker Compose.

---

## 🐳 Como Executar com Docker em uma VPS (Recomendado)

### 1. Clonar o Repositório
```bash
git clone https://github.com/Zooltek/EPR_Dashboard.git
cd EPR_Dashboard
```

### 2. Configurar o `.env`
```bash
cp .env.example .env
nano .env # Ajuste as credenciais de FTP do cliente
```

### 3. Subir os Containers
```bash
docker compose up -d --build
```

O dashboard e a API estarão disponíveis em `http://IP_DA_SUA_VPS:3001`.

---

## 🛠️ Como Executar Localmente (Sem Docker)

### 1. Backend
```bash
cd server
npm install
npm run dev
```

### 2. Frontend
```bash
cd client
npm install
npm run dev
```

---

## 📄 Licença
Proprietário / Zooltek.
