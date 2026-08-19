import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { db } from '../db/database';
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
      const result = await importPbiZip(file.path);
      results.push(result);
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

