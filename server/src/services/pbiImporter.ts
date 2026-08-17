import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { db } from '../db/database';

const parser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: true,
  trimValues: true,
});

function ensureArray(val: any): any[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

function parseFilename(filename: string) {
  const match = filename.match(/^PBI_(\d{14})_(\d{8})_(\d{6})\.zip$/i);
  if (!match) return null;

  const cnpj = match[1];
  const dateStr = match[2]; // AAAAMMDD
  const timeStr = match[3]; // HHMMSS

  const formattedDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
  const formattedTime = `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}:${timeStr.substring(4, 6)}`;

  return { cnpj, dataPbi: formattedDate, horaPbi: formattedTime };
}

export interface ImportResult {
  success: boolean;
  filename: string;
  status: string;
  message?: string;
  processedRecords?: number;
}

export async function importPbiZip(zipFilePath: string): Promise<ImportResult> {
  const filename = path.basename(zipFilePath);
  const parsed = parseFilename(filename);

  let fileSize = 0;
  try {
    const stats = fs.statSync(zipFilePath);
    fileSize = stats.size;
  } catch (err) {
    // File read error
  }

  // 1. Validate filename structure
  if (!parsed) {
    db.prepare(`
      INSERT INTO pbi_arquivo (nome_arquivo, cnpj_loja, data_pbi, hora_pbi, tamanho_bytes, status, mensagem_erro)
      VALUES (?, '00000000000000', '', '', ?, 'INVALIDO', 'Nome de arquivo fora do padrao PBI_<CNPJ>_<AAAAMMDD>_<HHMMSS>.zip')
      ON CONFLICT(nome_arquivo) DO UPDATE SET
        status = 'INVALIDO',
        mensagem_erro = 'Nome de arquivo fora do padrao PBI_<CNPJ>_<AAAAMMDD>_<HHMMSS>.zip'
    `).run(filename, fileSize);

    return {
      success: false,
      filename,
      status: 'INVALIDO',
      message: 'Nome de arquivo fora do padrão PBI_<CNPJ>_<AAAAMMDD>_<HHMMSS>.zip',
    };
  }

  const { cnpj, dataPbi, horaPbi } = parsed;

  // 2. Check or auto-register store for CNPJ
  let store = db.prepare(`SELECT id, empresa_id FROM loja WHERE cnpj = ?`).get(cnpj) as
    | { id: number; empresa_id: number }
    | undefined;

  if (!store) {
    const insertLoja = db.prepare(`
      INSERT INTO loja (empresa_id, id_loja_erp, cnpj, nome, status)
      VALUES (1, 1, ?, ?, 'ATIVO')
    `);
    const res = insertLoja.run(cnpj, `Loja ${cnpj}`);
    store = { id: Number(res.lastInsertRowid), empresa_id: 1 };
  }

  // 3. Idempotency Check
  const existing = db.prepare(`SELECT status FROM pbi_arquivo WHERE nome_arquivo = ?`).get(filename) as
    | { status: string }
    | undefined;

  if (existing && existing.status === 'ATUALIZADA') {
    return {
      success: true,
      filename,
      status: 'ATUALIZADA',
      message: 'Arquivo já processado anteriormente.',
      processedRecords: 0,
    };
  }

  // 4. Read Zip with JSZip
  const xmlMap: Record<string, string> = {};

  try {
    const fileBuffer = fs.readFileSync(zipFilePath);
    const zip = await JSZip.loadAsync(fileBuffer);

    for (const relativePath of Object.keys(zip.files)) {
      const entry = zip.files[relativePath];
      if (!entry.dir && relativePath.toLowerCase().endsWith('.xml')) {
        const textContent = await entry.async('text');
        const baseName = path.basename(relativePath);
        let entityName = baseName;
        if (baseName.includes('_')) {
          const parts = baseName.split('_');
          entityName = parts[parts.length - 1];
        }
        xmlMap[entityName.toLowerCase()] = textContent;
      }
    }
  } catch (err: any) {
    db.prepare(`
      INSERT INTO pbi_arquivo (nome_arquivo, cnpj_loja, loja_id, empresa_id, data_pbi, hora_pbi, tamanho_bytes, status, mensagem_erro)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'ERRO', ?)
      ON CONFLICT(nome_arquivo) DO UPDATE SET status = 'ERRO', mensagem_erro = ?
    `).run(filename, cnpj, store.id, store.empresa_id, dataPbi, horaPbi, fileSize, `Erro ao abrir ZIP: ${err.message}`, `Erro ao abrir ZIP: ${err.message}`);

    return {
      success: false,
      filename,
      status: 'ERRO',
      message: `ZIP corrompido ou inválido: ${err.message}`,
    };
  }

  let totalRecords = 0;

  // 5. Execute DB Import inside a transaction
  const transaction = db.transaction(() => {
    // Loja.xml
    if (xmlMap['loja.xml']) {
      const parsedXml = parser.parse(xmlMap['loja.xml']);
      const lojaObj = parsedXml?.cadLoja?.loja;
      if (lojaObj) {
        const erpId = lojaObj.idLoja ? Number(lojaObj.idLoja) : store.id;
        const storeName = String(lojaObj.xFant || lojaObj.xNome || `Loja ${cnpj}`);
        db.prepare(`
          UPDATE loja SET 
            id_loja_erp = ?,
            nome = ?, 
            status = 'ATIVO' 
          WHERE cnpj = ?
        `).run(erpId, storeName, cnpj);
      }
    }

    // Colecao.xml
    if (xmlMap['colecao.xml']) {
      const parsedXml = parser.parse(xmlMap['colecao.xml']);
      const colecoes = ensureArray(parsedXml?.cadColecao?.colecao);
      const stmt = db.prepare(`INSERT OR REPLACE INTO colecao (id, nome, abreviatura) VALUES (?, ?, ?)`);
      for (const item of colecoes) {
        stmt.run(item.idColecao, String(item.xNome || ''), String(item.xAbreviatura || ''));
        totalRecords++;
      }
    }

    // Cor.xml
    if (xmlMap['cor.xml']) {
      const parsedXml = parser.parse(xmlMap['cor.xml']);
      const cores = ensureArray(parsedXml?.cadCor?.cor);
      const stmt = db.prepare(`INSERT OR REPLACE INTO cor (id, nome) VALUES (?, ?)`);
      for (const item of cores) {
        stmt.run(item.idCor, String(item.xNome || ''));
        totalRecords++;
      }
    }

    // Familia.xml
    if (xmlMap['familia.xml']) {
      const parsedXml = parser.parse(xmlMap['familia.xml']);
      const familias = ensureArray(parsedXml?.cadFamilia?.familia);
      const stmt = db.prepare(`INSERT OR REPLACE INTO familia (id, nome, abreviatura) VALUES (?, ?, ?)`);
      for (const item of familias) {
        stmt.run(item.idFamilia, String(item.xNome || ''), String(item.xAbreviatura || ''));
        totalRecords++;
      }
    }

    // Grupo.xml
    if (xmlMap['grupo.xml']) {
      const parsedXml = parser.parse(xmlMap['grupo.xml']);
      const grupos = ensureArray(parsedXml?.cadGrupo?.grupo);
      const stmt = db.prepare(`INSERT OR REPLACE INTO grupo (id, nome, abreviatura) VALUES (?, ?, ?)`);
      for (const item of grupos) {
        stmt.run(item.idGrupo, String(item.xNome || ''), String(item.xAbreviatura || ''));
        totalRecords++;
      }
    }

    // Marca.xml
    if (xmlMap['marca.xml']) {
      const parsedXml = parser.parse(xmlMap['marca.xml']);
      const marcas = ensureArray(parsedXml?.cadMarca?.marca);
      const stmt = db.prepare(`INSERT OR REPLACE INTO marca (id, nome, abreviatura) VALUES (?, ?, ?)`);
      for (const item of marcas) {
        stmt.run(item.idMarca, String(item.xNome || ''), String(item.xAbreviatura || ''));
        totalRecords++;
      }
    }

    // Tamanho.xml
    if (xmlMap['tamanho.xml']) {
      const parsedXml = parser.parse(xmlMap['tamanho.xml']);
      const tamanhos = ensureArray(parsedXml?.cadTamanho?.tamanho);
      const stmt = db.prepare(`INSERT OR REPLACE INTO tamanho (codigo) VALUES (?)`);
      for (const item of tamanhos) {
        stmt.run(String(item.cTamanho || ''));
        totalRecords++;
      }
    }

    // Vendedor.xml
    if (xmlMap['vendedor.xml']) {
      const parsedXml = parser.parse(xmlMap['vendedor.xml']);
      const vendedores = ensureArray(parsedXml?.cadVendedor?.vendedor);
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO vendedor (id_vendedor, loja_id, nome, apelido, cpf, funcao, data_entrada, data_saida, data_alt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const item of vendedores) {
        stmt.run(
          item.idVendedor,
          store.id,
          String(item.xNome || ''),
          String(item.xApelido || ''),
          String(item.CPF || ''),
          String(item.xFuncao || ''),
          String(item.dEntrada || ''),
          String(item.dSaida || ''),
          String(item.dAlt || '')
        );
        totalRecords++;
      }
    }

    // Cliente.xml
    if (xmlMap['cliente.xml']) {
      const parsedXml = parser.parse(xmlMap['cliente.xml']);
      const clientes = ensureArray(parsedXml?.cadCliente?.cliente);
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO cliente (id_cliente, loja_id, pessoa, nome, cpf, cnpj, email, sexo, data_nasc, data_cad, data_alt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const item of clientes) {
        stmt.run(
          item.idCliente,
          store.id,
          String(item.pessoa || ''),
          String(item.xNome || ''),
          String(item.CPF || ''),
          String(item.CNPJ || ''),
          String(item.Email || ''),
          String(item.sexo || ''),
          String(item.dNasc || ''),
          String(item.dCad || ''),
          String(item.dAlt || '')
        );
        totalRecords++;
      }
    }

    // Produto.xml
    if (xmlMap['produto.xml']) {
      const parsedXml = parser.parse(xmlMap['produto.xml']);
      const produtos = ensureArray(parsedXml?.cadProduto?.produto);
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO produto (ref_id, nome, unidade, marca_id, grupo_id, familia_id, colecao_id, preco_custo, preco_tab1, data_cad, data_alt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const item of produtos) {
        stmt.run(
          String(item.refID),
          String(item.xNome || ''),
          String(item.xUnidade || ''),
          item.idMarca || null,
          item.idGrupo || null,
          item.idFamilia || null,
          item.idColecao || null,
          Number(item.precoCusto) || 0.0,
          Number(item.precoTab1) || 0.0,
          String(item.dCad || ''),
          String(item.dAlt || '')
        );
        totalRecords++;
      }
    }

    // Estoque.xml
    if (xmlMap['estoque.xml']) {
      const parsedXml = parser.parse(xmlMap['estoque.xml']);
      const estoques = ensureArray(parsedXml?.estoque?.produto);
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO estoque (loja_id, ref_id, cor_id, tamanho, qtd, data_alt)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const item of estoques) {
        stmt.run(
          store.id,
          String(item.refID),
          item.idCor,
          String(item.cTamanho),
          Number(item.qtd) || 0.0,
          String(item.dAlt || '')
        );
        totalRecords++;
      }
    }

    // VendaCab.xml
    if (xmlMap['vendacab.xml']) {
      const parsedXml = parser.parse(xmlMap['vendacab.xml']);
      const cabecalhos = ensureArray(parsedXml?.vendaCab?.cabecalho);
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO venda_cab (
          loja_id, d_venda, c_venda, vendedor_id, cliente_id, h_venda, cancelada,
          v_subtotal, v_credito, v_desconto, v_acrescimo, v_frete, v_total,
          t_pag1, v_pag1, q_parc1,
          t_pag2, v_pag2, q_parc2,
          t_pag3, v_pag3, q_parc3,
          t_pag4, v_pag4, q_parc4,
          t_pag5, v_pag5, q_parc5,
          t_pag6, v_pag6, q_parc6,
          t_pag7, v_pag7, q_parc7
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?
        )
      `);
      for (const item of cabecalhos) {
        stmt.run(
          store.id,
          String(item.dVenda),
          Number(item.cVenda),
          item.idVendedor || null,
          item.idCliente || null,
          String(item.hVenda || ''),
          Number(item.cancelada) || 0,
          Number(item.vSubtotal) || 0.0,
          Number(item.vCredito) || 0.0,
          Number(item.vDesconto) || 0.0,
          Number(item.vAcrescimo) || 0.0,
          Number(item.vFrete) || 0.0,
          Number(item.vTotal) || 0.0,
          String(item.tPag1 || ''), Number(item.vPag1) || 0.0, Number(item.qParc1) || 0,
          String(item.tPag2 || ''), Number(item.vPag2) || 0.0, Number(item.qParc2) || 0,
          String(item.tPag3 || ''), Number(item.vPag3) || 0.0, Number(item.qParc3) || 0,
          String(item.tPag4 || ''), Number(item.vPag4) || 0.0, Number(item.qParc4) || 0,
          String(item.tPag5 || ''), Number(item.vPag5) || 0.0, Number(item.qParc5) || 0,
          String(item.tPag6 || ''), Number(item.vPag6) || 0.0, Number(item.qParc6) || 0,
          String(item.tPag7 || ''), Number(item.vPag7) || 0.0, Number(item.qParc7) || 0
        );
        totalRecords++;
      }
    }

    // VendaItem.xml
    if (xmlMap['vendaitem.xml']) {
      const parsedXml = parser.parse(xmlMap['vendaitem.xml']);
      const itens = ensureArray(parsedXml?.vendaItem?.item);
      const stmt = db.prepare(`
        INSERT INTO venda_item (
          loja_id, d_venda, c_venda, n_item, entrada, ref_id, cor_id, tamanho,
          cancelado, promocao, c_tabela, qtd, preco_bruto, preco_liq, total_bruto, total_liq
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const item of itens) {
        stmt.run(
          store.id,
          String(item.dVenda),
          Number(item.cVenda),
          Number(item.nItem),
          Number(item.entrada) || 0,
          String(item.refID),
          item.idCor || null,
          String(item.cTamanho || ''),
          Number(item.cancelado) || 0,
          Number(item.promocao) || 0,
          Number(item.cTabela) || 1,
          Number(item.qtd) || 0.0,
          Number(item.precoBruto) || 0.0,
          Number(item.precoLiq) || 0.0,
          Number(item.totalBruto) || 0.0,
          Number(item.totalLiq) || 0.0
        );
        totalRecords++;
      }
    }

    // Save Log in pbi_arquivo
    db.prepare(`
      INSERT INTO pbi_arquivo (nome_arquivo, cnpj_loja, loja_id, empresa_id, data_pbi, hora_pbi, tamanho_bytes, status, data_processamento, qtd_registros)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'ATUALIZADA', datetime('now', 'localtime'), ?)
      ON CONFLICT(nome_arquivo) DO UPDATE SET
        status = 'ATUALIZADA',
        data_processamento = datetime('now', 'localtime'),
        mensagem_erro = NULL,
        qtd_registros = ?
    `).run(filename, cnpj, store.id, store.empresa_id, dataPbi, horaPbi, fileSize, totalRecords, totalRecords);
  });

  try {
    transaction();
    return {
      success: true,
      filename,
      status: 'ATUALIZADA',
      message: 'Arquivo PBI importado com sucesso.',
      processedRecords: totalRecords,
    };
  } catch (err: any) {
    db.prepare(`
      INSERT INTO pbi_arquivo (nome_arquivo, cnpj_loja, loja_id, empresa_id, data_pbi, hora_pbi, tamanho_bytes, status, mensagem_erro)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'ERRO', ?)
      ON CONFLICT(nome_arquivo) DO UPDATE SET status = 'ERRO', mensagem_erro = ?
    `).run(filename, cnpj, store.id, store.empresa_id, dataPbi, horaPbi, fileSize, err.message, err.message);

    return {
      success: false,
      filename,
      status: 'ERRO',
      message: `Erro na importação: ${err.message}`,
    };
  }
}
