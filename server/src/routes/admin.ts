import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { db, dbPath } from '../db/database';
import { runFullSync } from '../services/ftpSyncService';
import { importPbiZip } from '../services/pbiImporter';

export const adminRouter = Router();

const downloadsDir = path.join(__dirname, '../../downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, downloadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max per zip
  fileFilter: (req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos .zip são permitidos.'));
    }
  },
});

// 1. Filter Dropdown Options API
adminRouter.get('/filters', (req: Request, res: Response) => {
  const lojas = db.prepare(`SELECT id, nome, cnpj FROM loja WHERE status = 'ATIVO'`).all();
  const vendedores = db.prepare(`SELECT DISTINCT id_vendedor as id, nome, loja_id FROM vendedor ORDER BY nome ASC`).all();
  const marcas = db.prepare(`SELECT id, nome FROM marca ORDER BY nome ASC`).all();
  const grupos = db.prepare(`SELECT id, nome FROM grupo ORDER BY nome ASC`).all();
  const familias = db.prepare(`SELECT id, nome FROM familia ORDER BY nome ASC`).all();
  const colecoes = db.prepare(`SELECT id, nome FROM colecao ORDER BY nome ASC`).all();

  res.json({
    lojas,
    vendedores,
    marcas,
    grupos,
    familias,
    colecoes,
  });
});

// 2. Lojas List / Create / Update
adminRouter.get('/lojas', (req: Request, res: Response) => {
  const sql = `SELECT * FROM loja ORDER BY id ASC`;
  const lojas = db.prepare(sql).all();
  res.json(lojas);
});

adminRouter.post('/lojas', (req: Request, res: Response) => {
  const { idLojaErp, cnpj, nome } = req.body;
  if (!cnpj || !nome) {
    return res.status(400).json({ error: 'CNPJ e Nome são obrigatórios.' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO loja (empresa_id, id_loja_erp, cnpj, nome) VALUES (1, ?, ?, ?)
    `);
    const result = stmt.run(idLojaErp || 1, cnpj, nome);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminRouter.put('/lojas/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { nome, id_loja_erp } = req.body;
  if (!nome) {
    return res.status(400).json({ error: 'Nome da loja é obrigatório.' });
  }

  try {
    const existing = db.prepare(`SELECT * FROM loja WHERE id = ?`).get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Loja não encontrada.' });
    }

    db.prepare(`
      UPDATE loja SET 
        nome = ?,
        id_loja_erp = COALESCE(?, id_loja_erp)
      WHERE id = ?
    `).run(nome.trim(), id_loja_erp ? Number(id_loja_erp) : null, id);

    res.json({ success: true, message: 'Loja atualizada com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Arquivos PBI Log & Status
adminRouter.get('/pbi-files', (req: Request, res: Response) => {
  const { status, cnpj } = req.query;
  let sql = `
    SELECT p.*, l.nome as loja_nome
    FROM pbi_arquivo p
    LEFT JOIN loja l ON p.loja_id = l.id
  `;
  const params: any[] = [];
  const clauses: string[] = [];

  if (status) {
    clauses.push('p.status = ?');
    params.push(status);
  }
  if (cnpj) {
    clauses.push('p.cnpj_loja = ?');
    params.push(cnpj);
  }

  if (clauses.length > 0) {
    sql += ' WHERE ' + clauses.join(' AND ');
  }

  sql += ' ORDER BY p.id DESC';
  const logs = db.prepare(sql).all(...params);
  res.json(logs);
});

// 4. Trigger Manual Sync PBI (Local e/ou FTP)
adminRouter.post('/sync-pbi', async (req: Request, res: Response) => {
  try {
    const { localDir, ftp } = req.body || {};
    const result = await runFullSync({ localDir, ftp });
    res.json({ count: result.importResults?.length || 0, ...result });
  } catch (err: any) {
    console.error('[Admin API] Erro no sync-pbi:', err);
    res.status(500).json({ error: err.message || 'Erro interno na sincronização' });
  }
});

// 5. Upload Direto de Arquivos PBI (.zip)
adminRouter.post('/upload-pbi', upload.array('files', 20), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo .zip enviado.' });
    }

    const results = [];
    for (const file of files) {
      console.log(`[Upload Direto] Processando arquivo: ${file.originalname} (${file.size} bytes)`);
      try {
        const result = await importPbiZip(file.path);
        results.push(result);
        if (result.success && (result.processedRecords || 0) > 0) {
          const { incrementSyncVersion } = require('../services/ftpSyncService');
          incrementSyncVersion();
        }
      } finally {
        // Remove o arquivo enviado apos o processamento para nao ocupar espaco
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (_) {}
      }
    }

    res.json({
      success: true,
      message: `${files.length} arquivo(s) enviado(s) e processado(s) com sucesso!`,
      results,
    });
  } catch (err: any) {
    console.error('[Admin API] Erro no upload direto:', err);
    res.status(500).json({ error: err.message || 'Falha ao processar arquivos' });
  }
});

// 6. Obter e Salvar Configurações de Sincronização (FTP / Local)
adminRouter.get('/config-sync', (req: Request, res: Response) => {
  try {
    const { getSyncConfig } = require('../services/ftpSyncService');
    const config = getSyncConfig();
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

adminRouter.post('/config-sync', (req: Request, res: Response) => {
  try {
    const { saveSyncConfig } = require('../services/ftpSyncService');
    const saved = saveSyncConfig(req.body);
    res.json({ success: true, message: 'Configurações de sincronização salvas com sucesso!', config: saved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Testar Conexão FTP ou Pasta Local
adminRouter.post('/test-ftp', async (req: Request, res: Response) => {
  try {
    const { testFtpConnection } = require('../services/ftpSyncService');
    const result = await testFtpConnection(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message, filesFound: [] });
  }
});

// 8. Backup dos Dados Locais (Download do SQLite)
adminRouter.get('/backup-db', (req: Request, res: Response) => {
  try {
    // Forca o SQLite a despejar todo o WAL para o arquivo principal
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
    } catch (walErr) {
      console.warn('[Admin API] Aviso no wal_checkpoint:', walErr);
    }

    const candidatePaths = [
      dbPath,
      path.join(process.env.EPR_DATA_DIR || '', 'dashboard.sqlite'),
      path.join(__dirname, '../../data/dashboard.sqlite'),
      path.join(process.cwd(), 'server/data/dashboard.sqlite'),
    ];

    const targetDb = candidatePaths.find(p => p && fs.existsSync(p));

    if (!targetDb) {
      return res.status(404).json({ error: 'Arquivo de banco de dados não encontrado no servidor.' });
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `backup-amura-dashboard-${dateStr}.sqlite`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.download(targetDb, filename);
  } catch (err: any) {
    console.error('[Admin API] Erro ao gerar backup:', err);
    res.status(500).json({ error: err.message });
  }
});

// 9. Status de Versão da Sincronização (para Auto-Reload)
adminRouter.get('/sync-status', (req: Request, res: Response) => {
  try {
    const { getSyncVersion } = require('../services/ftpSyncService');
    res.json({
      syncVersion: getSyncVersion(),
      timestamp: Date.now(),
    });
  } catch (err: any) {
    res.json({ syncVersion: 1, timestamp: Date.now() });
  }
});

// 10. Manual do Usuário (Markdown e PDF)
adminRouter.get('/manual/markdown', (req: Request, res: Response) => {
  const clientDist = process.env.CLIENT_DIST_DIR || path.join(__dirname, '../../client/dist');
  const resPath = (process as any).resourcesPath || '';
  const possiblePaths = [
    path.join(process.cwd(), 'MANUAL_DO_USUARIO.md'),
    path.join(clientDist, 'MANUAL_DO_USUARIO.md'),
    path.join(__dirname, '../../../MANUAL_DO_USUARIO.md'),
    path.join(__dirname, '../../MANUAL_DO_USUARIO.md'),
    path.join(__dirname, '../MANUAL_DO_USUARIO.md'),
    path.join(resPath, 'MANUAL_DO_USUARIO.md'),
    path.join(resPath, 'app/MANUAL_DO_USUARIO.md'),
    path.join(resPath, 'app/client/dist/MANUAL_DO_USUARIO.md'),
  ];
  let content = '';
  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) {
      content = fs.readFileSync(p, 'utf-8');
      break;
    }
  }
  if (!content) {
    return res.status(404).json({ error: 'Manual do usuário não encontrado.' });
  }
  res.json({ content });
});

adminRouter.get('/manual/pdf', (req: Request, res: Response) => {
  const clientDist = process.env.CLIENT_DIST_DIR || path.join(__dirname, '../../client/dist');
  const resPath = (process as any).resourcesPath || '';
  const possiblePaths = [
    path.join(process.cwd(), 'Manual_do_Usuario_Amura_Dashboard.pdf'),
    path.join(clientDist, 'Manual_do_Usuario_Amura_Dashboard.pdf'),
    path.join(__dirname, '../../../Manual_do_Usuario_Amura_Dashboard.pdf'),
    path.join(__dirname, '../../Manual_do_Usuario_Amura_Dashboard.pdf'),
    path.join(__dirname, '../Manual_do_Usuario_Amura_Dashboard.pdf'),
    path.join(resPath, 'Manual_do_Usuario_Amura_Dashboard.pdf'),
    path.join(resPath, 'app/Manual_do_Usuario_Amura_Dashboard.pdf'),
    path.join(resPath, 'app/client/dist/Manual_do_Usuario_Amura_Dashboard.pdf'),
  ];
  let pdfPath = '';
  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) {
      pdfPath = p;
      break;
    }
  }
  if (!pdfPath) {
    return res.status(404).json({ error: 'PDF do Manual não encontrado.' });
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="Manual_do_Usuario_Amura_Dashboard.pdf"');
  res.download(pdfPath, 'Manual_do_Usuario_Amura_Dashboard.pdf');
});

