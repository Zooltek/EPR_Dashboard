import { Router, Request, Response } from 'express';
import path from 'path';
import { db } from '../db/database';
import { syncPbiFromFtp } from '../services/ftpSyncService';

export const adminRouter = Router();

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

// 2. Lojas List / Create
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

// 4. Trigger Manual Sync PBI & Real FTP
adminRouter.post('/sync-pbi', async (req: Request, res: Response) => {
  try {
    const result = await syncPbiFromFtp(req.body);
    res.json({ success: true, count: result.importResults?.length || 0, ...result });
  } catch (err: any) {
    console.error('[Admin API] Erro no sync-pbi:', err);
    res.status(500).json({ error: err.message || 'Erro interno na sincronização' });
  }
});
