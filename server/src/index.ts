import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { initDatabase } from './db/database';
import { runFullSync, restartSyncScheduler } from './services/ftpSyncService';
import { dashboardRouter } from './routes/dashboard';
import { adminRouter } from './routes/admin';

// Carrega variáveis padrão e segredos (.env.secrets) com precedência
dotenv.config();
const possibleSecrets = [
  path.resolve(process.cwd(), '.env.secrets'),
  path.resolve(__dirname, '../../.env.secrets'),
  path.resolve(__dirname, '../.env.secrets'),
];
for (const secretFile of possibleSecrets) {
  if (fs.existsSync(secretFile)) {
    dotenv.config({ path: secretFile, override: true });
    break;
  }
}

const app = express();

// Validação estrita da porta de rede (1 a 65535)
const parsedPort = Number(process.env.PORT);
const PORT = (!isNaN(parsedPort) && parsedPort > 0 && parsedPort <= 65535) ? parsedPort : 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize Database Schema
initDatabase();

// API Routes (suporta tanto acesso direto /api quanto via subpath de proxy /epr/api)
app.use('/api/dashboard', dashboardRouter);
app.use('/api/admin', adminRouter);
app.use('/epr/api/dashboard', dashboardRouter);
app.use('/epr/api/admin', adminRouter);

app.get(['/api/health', '/epr/api/health'], (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve frontend in production (if client/dist exists)
const clientDistCandidates = [
  process.env.CLIENT_DIST_DIR,
  path.join(__dirname, '../../client/dist'),
  path.join(__dirname, '../client/dist'),
  path.join(process.cwd(), 'client/dist'),
  path.join(process.cwd(), 'dist/client'),
].filter(Boolean) as string[];
const clientDist = clientDistCandidates.find(p => fs.existsSync(p));

if (clientDist) {
  console.log(`[Production] Servindo frontend estático de: ${clientDist}`);
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/epr/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[Server] Amura Dashboard rodando em http://localhost:${PORT}`);

  const { getSyncConfig } = require('./services/ftpSyncService');
  // 1. Iniciar agendador de sincronização periódica e watcher dinâmicos
  restartSyncScheduler();

  // 2. Executar Sincronização Inicial no Startup
  setTimeout(() => {
    console.log(`[Sync] Iniciando varredura inicial de arquivos...`);
    runFullSync()
      .then((res) => {
        console.log(`[Sync] ${res.message}`);
        res.importResults.forEach(r => {
          console.log(` - ${r.filename}: ${r.status} (${r.processedRecords || 0} registros)`);
        });
      })
      .catch((err) => {
        console.error('[Sync] Erro na sincronização inicial:', err);
      });
  }, 200);
});


