import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { importPbiZip } from '../src/services/pbiImporter';
import { initDatabase, db } from '../src/db/database';

describe('PBI Importer Tests', () => {
  const tempDir = path.join(__dirname, 'temp_test_pbi');

  beforeAll(() => {
    initDatabase();
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  beforeEach(() => {
    try {
      db.prepare(`DELETE FROM pbi_arquivo WHERE nome_arquivo LIKE 'PBI_99887766%'`).run();
      db.prepare(`DELETE FROM loja WHERE cnpj = '99887766000155'`).run();
    } catch {}
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('deve rejeitar e ignorar arquivos que não começam com PBI_', async () => {
    const invalidZip = path.join(tempDir, 'CXA1119082026.zip');
    fs.writeFileSync(invalidZip, Buffer.from('mock data'));

    const result = await importPbiZip(invalidZip);
    expect(result.success).toBe(false);
    expect(result.status).toBe('IGNORADO');
    expect(result.message).toContain('Arquivo ignorado');

    if (fs.existsSync(invalidZip)) fs.unlinkSync(invalidZip);
  });

  it('deve capturar erro ao processar arquivo ZIP corrompido', async () => {
    const corruptedZip = path.join(tempDir, 'PBI_12345678000199_20260819_100000.zip');
    fs.writeFileSync(corruptedZip, Buffer.from('conteúdo corrompido que não é zip válido'));

    const result = await importPbiZip(corruptedZip);
    expect(result.success).toBe(false);
    expect(result.status).toBe('ERRO');
    expect(result.message).toBeDefined();

    if (fs.existsSync(corruptedZip)) fs.unlinkSync(corruptedZip);
  });

  it('deve importar com sucesso um arquivo ZIP PBI válido com XMLs', async () => {
    const validZipPath = path.join(tempDir, 'PBI_99887766000155_20260819_140000.zip');
    const zip = new JSZip();

    // XML de Loja
    const lojaXml = `<?xml version="1.0" encoding="UTF-8"?>
<cadLoja>
  <loja>
    <idLoja>1</idLoja>
    <CNPJ>99887766000155</CNPJ>
    <xNome>Loja Teste Centro</xNome>
    <xFant>Loja Teste Centro</xFant>
  </loja>
</cadLoja>`;

    // XML de Coleção
    const colecaoXml = `<?xml version="1.0" encoding="UTF-8"?>
<cadColecao>
  <colecao>
    <idColecao>1</idColecao>
    <xNome>Verão 2026</xNome>
    <xAbreviatura>VER26</xAbreviatura>
  </colecao>
</cadColecao>`;

    // XML de Produto
    const produtoXml = `<?xml version="1.0" encoding="UTF-8"?>
<cadProduto>
  <produto>
    <refID>REF001</refID>
    <xNome>Tênis Esportivo Teste</xNome>
    <xUnidade>UN</xUnidade>
    <precoCusto>80.00</precoCusto>
    <precoTab1>160.00</precoTab1>
  </produto>
</cadProduto>`;

    zip.file('Loja.xml', lojaXml);
    zip.file('Colecao.xml', colecaoXml);
    zip.file('Produto.xml', produtoXml);

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    fs.writeFileSync(validZipPath, zipBuffer);

    const result = await importPbiZip(validZipPath);
    expect(result.success).toBe(true);
    expect(result.status).toBe('ATUALIZADA');
    expect(result.processedRecords).toBeGreaterThan(0);

    if (fs.existsSync(validZipPath)) fs.unlinkSync(validZipPath);
  });
});
