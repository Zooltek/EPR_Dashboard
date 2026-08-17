import express from 'express';
import cors from 'cors';
import path from 'path';
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

app.listen(PORT, () => {
  console.log(`[Server] EPR Dashboard Backend rodando em http://localhost:${PORT}`);
  
  // Initial Auto Sync on Startup for sample PBI directory
  const pbiDir = path.join(__dirname, '../../PBI');
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
});
