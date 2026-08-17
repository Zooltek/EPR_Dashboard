import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { initDatabase } from './db/database';
import { syncPbiFolder } from './services/ftpSyncService';
import { dashboardRouter } from './routes/dashboard';
import { adminRouter } from './routes/admin';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize Database Schema and Default Enterprise/Store
initDatabase();

// API Routes
app.use('/api/dashboard', dashboardRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve frontend in production (if client/dist exists)
const clientDistCandidates = [
  path.join(__dirname, '../../client/dist'),
  path.join(__dirname, '../client/dist'),
  path.join(process.cwd(), 'client/dist'),
  path.join(process.cwd(), 'dist/client'),
];
const clientDist = clientDistCandidates.find(p => fs.existsSync(p));

if (clientDist) {
  console.log(`[Production] Servindo frontend estático de: ${clientDist}`);
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[Server] EPR Dashboard rodando em http://localhost:${PORT}`);
  
  // Initial Auto Sync on Startup for sample PBI directory
  const pbiDir = path.join(__dirname, '../../PBI');
  if (fs.existsSync(pbiDir)) {
    console.log(`[PBI Sync] Procurando arquivos PBI em: ${pbiDir}`);
    setTimeout(() => {
      syncPbiFolder(pbiDir)
        .then((results) => {
          console.log(`[PBI Sync] Sincronização inicial concluída. ${results.length} arquivo(s) processado(s).`);
          results.forEach(r => console.log(` - ${r.filename}: ${r.status} (${r.processedRecords || 0} registros)`));
        })
        .catch((err) => {
          console.error('[PBI Sync] Erro na sincronização inicial:', err);
        });
    }, 100);
  }
});
