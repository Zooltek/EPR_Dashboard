import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const defaultDbDir = path.join(__dirname, '../../data');
const dbDir = process.env.EPR_DATA_DIR || defaultDbDir;
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'dashboard.sqlite');
export const db = new Database(dbPath);

// Enable Write-Ahead Logging (WAL) for concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    -- Empresa Table
    CREATE TABLE IF NOT EXISTS empresa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      razao_social TEXT NOT NULL,
      cnpj TEXT NOT NULL UNIQUE,
      nome_fantasia TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ATIVO',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Loja Table
    CREATE TABLE IF NOT EXISTS loja (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER NOT NULL,
      id_loja_erp INTEGER NOT NULL,
      cnpj TEXT NOT NULL UNIQUE,
      nome TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ATIVO',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresa(id) ON DELETE CASCADE
    );

    -- Log de Arquivos PBI
    CREATE TABLE IF NOT EXISTS pbi_arquivo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_arquivo TEXT NOT NULL UNIQUE,
      cnpj_loja TEXT NOT NULL,
      loja_id INTEGER,
      empresa_id INTEGER,
      data_pbi TEXT NOT NULL,
      hora_pbi TEXT NOT NULL,
      tamanho_bytes INTEGER NOT NULL,
      hash TEXT,
      data_download DATETIME DEFAULT CURRENT_TIMESTAMP,
      data_processamento DATETIME,
      status TEXT NOT NULL, -- ATUALIZADA, AGUARDANDO, ERRO, CNPJ_NAO_CADASTRADO, INVALIDO
      mensagem_erro TEXT,
      qtd_registros INTEGER DEFAULT 0,
      FOREIGN KEY (loja_id) REFERENCES loja(id) ON DELETE SET NULL,
      FOREIGN KEY (empresa_id) REFERENCES empresa(id) ON DELETE SET NULL
    );

    -- Configuração de Sincronização (FTP / Local)
    CREATE TABLE IF NOT EXISTS configuracao_sync (
      id INTEGER PRIMARY KEY,
      modo_sincronizacao TEXT NOT NULL DEFAULT 'FTP', -- 'FTP', 'LOCAL', 'AMBOS'
      provedor_ftp TEXT NOT NULL DEFAULT 'VIXHOST', -- 'VIXHOST', 'UOLHOST', 'CUSTOM'
      pasta_cliente_ftp TEXT DEFAULT 'fabricio',
      ftp_host TEXT DEFAULT 'ftp.consuldatasistemas.com.br',
      ftp_port INTEGER DEFAULT 21,
      ftp_user TEXT DEFAULT 'consuldata',
      ftp_password TEXT DEFAULT '8F1h#7ok',
      ftp_dir TEXT DEFAULT 'clientes/fabricio',
      pasta_local_pbi TEXT DEFAULT '',
      intervalo_minutos INTEGER DEFAULT 5,
      auto_sync_ativo INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Tabelas Auxiliares de Produto
    CREATE TABLE IF NOT EXISTS marca (
      id INTEGER PRIMARY KEY,
      nome TEXT NOT NULL,
      abreviatura TEXT
    );

    CREATE TABLE IF NOT EXISTS grupo (
      id INTEGER PRIMARY KEY,
      nome TEXT NOT NULL,
      abreviatura TEXT
    );

    CREATE TABLE IF NOT EXISTS familia (
      id INTEGER PRIMARY KEY,
      nome TEXT NOT NULL,
      abreviatura TEXT
    );

    CREATE TABLE IF NOT EXISTS colecao (
      id INTEGER PRIMARY KEY,
      nome TEXT NOT NULL,
      abreviatura TEXT
    );

    CREATE TABLE IF NOT EXISTS cor (
      id INTEGER PRIMARY KEY,
      nome TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tamanho (
      codigo TEXT PRIMARY KEY
    );

    -- Vendedor Table
    CREATE TABLE IF NOT EXISTS vendedor (
      id_vendedor INTEGER NOT NULL,
      loja_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      apelido TEXT,
      cpf TEXT,
      funcao TEXT,
      data_entrada TEXT,
      data_saida TEXT,
      data_alt TEXT,
      PRIMARY KEY (id_vendedor, loja_id),
      FOREIGN KEY (loja_id) REFERENCES loja(id) ON DELETE CASCADE
    );

    -- Cliente Table
    CREATE TABLE IF NOT EXISTS cliente (
      id_cliente INTEGER NOT NULL,
      loja_id INTEGER NOT NULL,
      pessoa TEXT,
      nome TEXT NOT NULL,
      cpf TEXT,
      cnpj TEXT,
      email TEXT,
      sexo TEXT,
      data_nasc TEXT,
      data_cad TEXT,
      data_alt TEXT,
      PRIMARY KEY (id_cliente, loja_id),
      FOREIGN KEY (loja_id) REFERENCES loja(id) ON DELETE CASCADE
    );

    -- Produto Table
    CREATE TABLE IF NOT EXISTS produto (
      ref_id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      unidade TEXT,
      marca_id INTEGER,
      grupo_id INTEGER,
      familia_id INTEGER,
      colecao_id INTEGER,
      preco_custo REAL DEFAULT 0.0,
      preco_tab1 REAL DEFAULT 0.0,
      data_cad TEXT,
      data_alt TEXT,
      FOREIGN KEY (marca_id) REFERENCES marca(id),
      FOREIGN KEY (grupo_id) REFERENCES grupo(id),
      FOREIGN KEY (familia_id) REFERENCES familia(id),
      FOREIGN KEY (colecao_id) REFERENCES colecao(id)
    );

    -- Estoque Table
    CREATE TABLE IF NOT EXISTS estoque (
      loja_id INTEGER NOT NULL,
      ref_id TEXT NOT NULL,
      cor_id INTEGER NOT NULL,
      tamanho TEXT NOT NULL,
      qtd REAL DEFAULT 0.0,
      data_alt TEXT,
      PRIMARY KEY (loja_id, ref_id, cor_id, tamanho),
      FOREIGN KEY (loja_id) REFERENCES loja(id) ON DELETE CASCADE,
      FOREIGN KEY (ref_id) REFERENCES produto(ref_id) ON DELETE CASCADE,
      FOREIGN KEY (cor_id) REFERENCES cor(id)
    );

    -- Venda Cabecalho Table
    CREATE TABLE IF NOT EXISTS venda_cab (
      loja_id INTEGER NOT NULL,
      d_venda TEXT NOT NULL,
      c_venda INTEGER NOT NULL,
      vendedor_id INTEGER,
      cliente_id INTEGER,
      h_venda TEXT,
      cancelada INTEGER DEFAULT 0, -- 0=Não, 1=Sim
      v_subtotal REAL DEFAULT 0.0,
      v_credito REAL DEFAULT 0.0,
      v_desconto REAL DEFAULT 0.0,
      v_acrescimo REAL DEFAULT 0.0,
      v_frete REAL DEFAULT 0.0,
      v_total REAL DEFAULT 0.0,
      t_pag1 TEXT, v_pag1 REAL, q_parc1 INTEGER,
      t_pag2 TEXT, v_pag2 REAL, q_parc2 INTEGER,
      t_pag3 TEXT, v_pag3 REAL, q_parc3 INTEGER,
      t_pag4 TEXT, v_pag4 REAL, q_parc4 INTEGER,
      t_pag5 TEXT, v_pag5 REAL, q_parc5 INTEGER,
      t_pag6 TEXT, v_pag6 REAL, q_parc6 INTEGER,
      t_pag7 TEXT, v_pag7 REAL, q_parc7 INTEGER,
      PRIMARY KEY (loja_id, d_venda, c_venda),
      FOREIGN KEY (loja_id) REFERENCES loja(id) ON DELETE CASCADE
    );

    -- Venda Item Table
    CREATE TABLE IF NOT EXISTS venda_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loja_id INTEGER NOT NULL,
      d_venda TEXT NOT NULL,
      c_venda INTEGER NOT NULL,
      n_item INTEGER NOT NULL,
      entrada INTEGER DEFAULT 0, -- 0=Saida/Venda, 1=Entrada/Devolucao/Troca
      ref_id TEXT NOT NULL,
      cor_id INTEGER,
      tamanho TEXT,
      cancelado INTEGER DEFAULT 0, -- 0=Não, 1=Sim
      promocao INTEGER DEFAULT 0,
      c_tabela INTEGER,
      qtd REAL DEFAULT 0.0,
      preco_bruto REAL DEFAULT 0.0,
      preco_liq REAL DEFAULT 0.0,
      total_bruto REAL DEFAULT 0.0,
      total_liq REAL DEFAULT 0.0,
      FOREIGN KEY (loja_id, d_venda, c_venda) REFERENCES venda_cab(loja_id, d_venda, c_venda) ON DELETE CASCADE,
      FOREIGN KEY (ref_id) REFERENCES produto(ref_id)
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_venda_cab_loja_date ON venda_cab(loja_id, d_venda);
    CREATE INDEX IF NOT EXISTS idx_venda_item_venda ON venda_item(loja_id, d_venda, c_venda);
    CREATE INDEX IF NOT EXISTS idx_venda_item_ref ON venda_item(ref_id);
    CREATE INDEX IF NOT EXISTS idx_estoque_loja_ref ON estoque(loja_id, ref_id);
    CREATE INDEX IF NOT EXISTS idx_produto_marca ON produto(marca_id);
    CREATE INDEX IF NOT EXISTS idx_produto_grupo ON produto(grupo_id);
    CREATE INDEX IF NOT EXISTS idx_produto_familia ON produto(familia_id);
    CREATE INDEX IF NOT EXISTS idx_produto_colecao ON produto(colecao_id);
  `);

  // Ensure Default Empresa and Store exist for initial demo/import
  const empresaStmt = db.prepare(`SELECT count(*) as count FROM empresa`);
  const { count } = empresaStmt.get() as { count: number };
  
  if (count === 0) {
    const insertEmpresa = db.prepare(`
      INSERT INTO empresa (razao_social, cnpj, nome_fantasia, status)
      VALUES ('GDB CALCADOS LTDA', '39310768000105', 'GDB CALÇADOS', 'ATIVO')
    `);
    const result = insertEmpresa.run();
    const empresaId = result.lastInsertRowid;

    const insertLoja = db.prepare(`
      INSERT INTO loja (empresa_id, id_loja_erp, cnpj, nome, status)
      VALUES (?, 2, '39310768000105', 'Loja 02 - Cachoeiro Centro', 'ATIVO')
    `);
    insertLoja.run(empresaId);
  }

  // Ensure Default Sync Configuration exists
  const syncStmt = db.prepare(`SELECT count(*) as count FROM configuracao_sync`);
  const syncRow = syncStmt.get() as { count: number };
  if (syncRow.count === 0) {
    db.prepare(`
      INSERT INTO configuracao_sync (id, modo_sincronizacao, provedor_ftp, pasta_cliente_ftp, ftp_host, ftp_port, ftp_user, ftp_password, ftp_dir, pasta_local_pbi, intervalo_minutos, auto_sync_ativo)
      VALUES (1, 'FTP', 'VIXHOST', 'fabricio', 'ftp.consuldatasistemas.com.br', 21, 'consuldata', '8F1h#7ok', 'cliente/fabricio', '', 5, 1)
    `).run();
  }
}
