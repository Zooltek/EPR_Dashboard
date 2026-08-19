import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { initDatabase } from './db/database';
import { runFullSync, startPbiDirectoryWatcher } from './services/ftpSyncService';
import { dashboardRouter } from './routes/dashboard';
import { adminRouter } from './routes/admin';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize Database Schema and Default Enterprise/Store
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
  const cfg = getSyncConfig();
  const localPbiDir = cfg.pasta_local_pbi || process.env.LOCAL_PBI_DIR || path.join(__dirname, '../../../PBI');
  
  // 1. Iniciar File Watcher para detectar novos arquivos PBI em tempo real
  startPbiDirectoryWatcher(localPbiDir);

  // 2. Executar Sincronização Inicial no Startup
  setTimeout(() => {
    console.log(`[Sync] Iniciando varredura inicial de arquivos...`);
    runFullSync({ localDir: localPbiDir })
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

  // 3. Agendador Periódico (Cron/Interval)
  const syncIntervalMinutes = cfg.intervalo_minutos || parseInt(process.env.SYNC_INTERVAL_MINUTES || '5', 10);
  if (cfg.auto_sync_ativo !== 0 && syncIntervalMinutes > 0) {
    const intervalMs = syncIntervalMinutes * 60 * 1000;
    console.log(`[Sync] Agendamento automático ativo a cada ${syncIntervalMinutes} minuto(s).`);
    setInterval(() => {
      console.log(`[Sync] Executando varredura periódica agendada...`);
      runFullSync({ localDir: localPbiDir })
        .then(res => {
          if (res.importResults.some(r => r.status === 'ATUALIZADA' && (r.processedRecords || 0) > 0)) {
            console.log(`[Sync] Novos registros processados na varredura periódica.`);
          }
        })
        .catch(err => console.error('[Sync] Erro na varredura periódica:', err));
    }, intervalMs);
  }
});


