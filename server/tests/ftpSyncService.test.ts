import { describe, it, expect, beforeEach } from 'vitest';
import { isPbiZip, getFtpPresets, getSyncConfig, saveSyncConfig } from '../src/services/ftpSyncService';

describe('FTP and PBI Sync Service', () => {
  describe('isPbiZip', () => {
    it('deve aceitar nomes de arquivos válidos no formato PBI_*.zip', () => {
      expect(isPbiZip('PBI_39310768000105_20260819_100000.zip')).toBe(true);
      expect(isPbiZip('pbi_00264297000100_20260819_120000.ZIP')).toBe(true);
    });

    it('deve rejeitar arquivos que não são PBI', () => {
      expect(isPbiZip('CXA1119082026.zip')).toBe(false);
      expect(isPbiZip('backup.zip')).toBe(false);
      expect(isPbiZip('PBI_39310768000105.txt')).toBe(false);
      expect(isPbiZip('relatorio.pdf')).toBe(false);
    });
  });

  describe('getFtpPresets', () => {
    it('deve carregar presets com valores padrão ou variáveis de ambiente', () => {
      const presets = getFtpPresets();
      expect(presets).toHaveProperty('VIXHOST');
      expect(presets).toHaveProperty('UOLHOST');
      expect(presets.VIXHOST.host).toBeDefined();
      expect(presets.VIXHOST.port).toBe(21);
      expect(presets.UOLHOST.host).toBeDefined();
      expect(presets.UOLHOST.port).toBe(21);
    });
  });

  describe('getSyncConfig e saveSyncConfig', () => {
    it('deve salvar e recuperar configurações de sincronização', () => {
      const saved = saveSyncConfig({
        modo_sincronizacao: 'FTP',
        provedor_ftp: 'VIXHOST',
        pasta_cliente_ftp: 'test_client',
        intervalo_minutos: 10,
        auto_sync_ativo: 1,
      });

      expect(saved.modo_sincronizacao).toBe('FTP');
      expect(saved.pasta_cliente_ftp).toBe('test_client');
      expect(saved.intervalo_minutos).toBe(10);

      const retrieved = getSyncConfig();
      expect(retrieved.pasta_cliente_ftp).toBe('test_client');
      expect(retrieved.intervalo_minutos).toBe(10);
    });
  });
});
