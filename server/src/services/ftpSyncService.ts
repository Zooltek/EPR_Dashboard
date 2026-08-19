import fs from 'fs';
import path from 'path';
import * as ftp from 'basic-ftp';
import dotenv from 'dotenv';
import { db } from '../db/database';
import { importPbiZip, ImportResult } from './pbiImporter';

dotenv.config();

export const FTP_PRESETS = {
  VIXHOST: {
    name: 'VixHost (Consuldata)',
    host: 'ftp.consuldatasistemas.com.br',
    port: 21,
    user: 'consuldata',
    password: '8F1h#7ok',
    baseDir: 'cliente',
  },
  UOLHOST: {
    name: 'UOLHost (Plenus)',
    host: 'ftp.sistemaplenus.com.br',
    port: 21,
    user: 'sistemaplenus',
    password: 'fTp#17902510',
    baseDir: 'cliente',
  },
};

export interface SyncConfig {
  id?: number;
  modo_sincronizacao: 'FTP' | 'LOCAL' | 'AMBOS';
  provedor_ftp: 'VIXHOST' | 'UOLHOST' | 'CUSTOM';
  pasta_cliente_ftp: string;
  ftp_host?: string;
  ftp_port?: number;
  ftp_user?: string;
  ftp_password?: string;
  ftp_dir?: string;
  pasta_local_pbi?: string;
  intervalo_minutos?: number;
  auto_sync_ativo?: number;
  updated_at?: string;
}

export function getSyncConfig(): SyncConfig {
  try {
    const row = db.prepare(`SELECT * FROM configuracao_sync WHERE id = 1`).get() as any;
    if (row) {
      return {
        ...row,
        auto_sync_ativo: Number(row.auto_sync_ativo),
        intervalo_minutos: Number(row.intervalo_minutos),
        ftp_port: Number(row.ftp_port || 21),
      };
    }
  } catch (err) {
    console.error('[ConfigSync] Erro ao carregar do banco:', err);
  }

  return {
    modo_sincronizacao: 'FTP',
    provedor_ftp: 'VIXHOST',
    pasta_cliente_ftp: 'fabricio',
    ftp_host: 'ftp.consuldatasistemas.com.br',
    ftp_port: 21,
    ftp_user: 'consuldata',
    ftp_password: '8F1h#7ok',
    ftp_dir: 'cliente/fabricio',
    pasta_local_pbi: '',
    intervalo_minutos: 5,
    auto_sync_ativo: 1,
  };
}

export function saveSyncConfig(cfg: Partial<SyncConfig>): SyncConfig {
  const current = getSyncConfig();
  const updated: SyncConfig = { ...current, ...cfg };

  // Calculate ftp_dir automatically if using standard presets
  if (updated.provedor_ftp === 'VIXHOST') {
    updated.ftp_host = FTP_PRESETS.VIXHOST.host;
    updated.ftp_port = FTP_PRESETS.VIXHOST.port;
    updated.ftp_user = FTP_PRESETS.VIXHOST.user;
    updated.ftp_password = FTP_PRESETS.VIXHOST.password;
    updated.ftp_dir = `cliente/${(updated.pasta_cliente_ftp || '').trim()}`;
  } else if (updated.provedor_ftp === 'UOLHOST') {
    updated.ftp_host = FTP_PRESETS.UOLHOST.host;
    updated.ftp_port = FTP_PRESETS.UOLHOST.port;
    updated.ftp_user = FTP_PRESETS.UOLHOST.user;
    updated.ftp_password = FTP_PRESETS.UOLHOST.password;
    updated.ftp_dir = `cliente/${(updated.pasta_cliente_ftp || '').trim()}`;
  }

  db.prepare(`
    INSERT INTO configuracao_sync (
      id, modo_sincronizacao, provedor_ftp, pasta_cliente_ftp,
      ftp_host, ftp_port, ftp_user, ftp_password, ftp_dir,
      pasta_local_pbi, intervalo_minutos, auto_sync_ativo, updated_at
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      modo_sincronizacao = excluded.modo_sincronizacao,
      provedor_ftp = excluded.provedor_ftp,
      pasta_cliente_ftp = excluded.pasta_cliente_ftp,
      ftp_host = excluded.ftp_host,
      ftp_port = excluded.ftp_port,
      ftp_user = excluded.ftp_user,
      ftp_password = excluded.ftp_password,
      ftp_dir = excluded.ftp_dir,
      pasta_local_pbi = excluded.pasta_local_pbi,
      intervalo_minutos = excluded.intervalo_minutos,
      auto_sync_ativo = excluded.auto_sync_ativo,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    updated.modo_sincronizacao,
    updated.provedor_ftp,
    updated.pasta_cliente_ftp || '',
    updated.ftp_host || '',
    updated.ftp_port || 21,
    updated.ftp_user || '',
    updated.ftp_password || '',
    updated.ftp_dir || '',
    updated.pasta_local_pbi || '',
    updated.intervalo_minutos || 5,
    updated.auto_sync_ativo !== undefined ? updated.auto_sync_ativo : 1
  );

  // Restart watcher if local path changed
  if (updated.pasta_local_pbi) {
    startPbiDirectoryWatcher(updated.pasta_local_pbi);
  }

  return getSyncConfig();
}

export interface FtpSyncOptions {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  remoteDir?: string;
  provider?: 'VIXHOST' | 'UOLHOST' | 'CUSTOM';
  clientFolder?: string;
}

export interface SyncSummary {
  success: boolean;
  message: string;
  localDirScanned?: string;
  localFilesFound: string[];
  ftpConnected?: boolean;
  ftpMessage?: string;
  remoteFilesFound: string[];
  downloadedFiles: string[];
  importResults: ImportResult[];
}

export const isPbiZip = (name: string) => {
  const lower = name.toLowerCase();
  return lower.endsWith('.zip') && lower.startsWith('pbi');
};

let syncVersion = 1;
export function getSyncVersion() {
  return syncVersion;
}
export function incrementSyncVersion() {
  syncVersion++;
}

/**
 * Processa todos os arquivos .zip de um diretório local
 */
export async function syncLocalPbiFolder(targetDir?: string): Promise<{
  dirScanned: string;
  filesFound: string[];
  importResults: ImportResult[];
}> {
  const cfg = getSyncConfig();
  const pbiDir = targetDir || cfg.pasta_local_pbi || process.env.LOCAL_PBI_DIR || path.join(__dirname, '../../../PBI');
  const resolvedPath = path.isAbsolute(pbiDir) ? pbiDir : path.resolve(process.cwd(), pbiDir);

  const filesFound: string[] = [];
  const importResults: ImportResult[] = [];

  if (!fs.existsSync(resolvedPath)) {
    console.log(`[PBI Local] Diretório não encontrado: ${resolvedPath}`);
    return { dirScanned: resolvedPath, filesFound, importResults };
  }

  console.log(`[PBI Local] Escaneando pasta local por arquivos PBI: ${resolvedPath}`);
  const entries = fs.readdirSync(resolvedPath);
  const zipFiles = entries.filter(isPbiZip);

  for (const zip of zipFiles) {
    filesFound.push(zip);
    const fullPath = path.join(resolvedPath, zip);
    try {
      const res = await importPbiZip(fullPath);
      importResults.push(res);
      if (res.success && (res.processedRecords || 0) > 0) {
        incrementSyncVersion();
      }
    } catch (e: any) {
      console.error(`[PBI Local] Erro ao importar arquivo ${zip}:`, e.message);
      importResults.push({
        success: false,
        filename: zip,
        status: 'ERRO',
        message: e.message,
      });
    }
  }

  return { dirScanned: resolvedPath, filesFound, importResults };
}

/**
 * Testa a conexão FTP com os parâmetros informados ou salvos
 */
export async function testFtpConnection(options?: FtpSyncOptions): Promise<{
  success: boolean;
  message: string;
  filesFound: string[];
  currentDir?: string;
}> {
  const cfg = getSyncConfig();
  const provider = options?.provider || cfg.provedor_ftp || 'VIXHOST';
  const clientFolder = (options?.clientFolder !== undefined ? options.clientFolder : cfg.pasta_cliente_ftp || '').trim();

  let host = options?.host || cfg.ftp_host;
  let port = options?.port || cfg.ftp_port || 21;
  let user = options?.user || cfg.ftp_user;
  let password = options?.password || cfg.ftp_password;
  let remoteDir = options?.remoteDir || cfg.ftp_dir || `cliente/${clientFolder}`;

  if (provider === 'VIXHOST') {
    host = FTP_PRESETS.VIXHOST.host;
    port = FTP_PRESETS.VIXHOST.port;
    user = FTP_PRESETS.VIXHOST.user;
    password = FTP_PRESETS.VIXHOST.password;
    remoteDir = `cliente/${clientFolder}`;
  } else if (provider === 'UOLHOST') {
    host = FTP_PRESETS.UOLHOST.host;
    port = FTP_PRESETS.UOLHOST.port;
    user = FTP_PRESETS.UOLHOST.user;
    password = FTP_PRESETS.UOLHOST.password;
    remoteDir = `cliente/${clientFolder}`;
  }

  if (!host || !user || !password) {
    return {
      success: false,
      message: 'Host, usuário ou senha de FTP não informados.',
      filesFound: [],
    };
  }

  const client = new ftp.Client();
  client.ftp.verbose = false;

  try {
    await client.access({
      host,
      port: Number(port),
      user,
      password,
      secure: false,
    });

    // Se UOLHost, sair da pasta atual inicial e ir para raiz/cliente
    if (provider === 'UOLHOST') {
      try { await client.cd('..'); } catch {}
      try { await client.cd('/'); } catch {}
    }

    // Tentar acessar a pasta do cliente
    const candidates = [
      remoteDir,
      `cliente/${clientFolder}`,
      `clientes/${clientFolder}`,
      clientFolder,
    ];

    let accessedDir = '';
    for (const dir of candidates) {
      if (!dir) continue;
      try {
        await client.cd(dir);
        accessedDir = dir;
        break;
      } catch {}
    }

    const list = await client.list();
    const zipEntries = list.filter(item => isPbiZip(item.name)).map(item => item.name);

    client.close();
    return {
      success: true,
      message: `Conectado com sucesso em ${host}! Pasta acessada: '${accessedDir || '/'}' com ${zipEntries.length} arquivo(s) PBI encontrados.`,
      filesFound: zipEntries,
      currentDir: accessedDir,
    };
  } catch (err: any) {
    try { client.close(); } catch {}
    return {
      success: false,
      message: `Falha na conexão FTP (${host}): ${err.message}`,
      filesFound: [],
    };
  }
}

/**
 * Conecta ao FTP e baixa novos arquivos .zip para a pasta downloads
 */
export async function syncPbiFromFtp(options?: FtpSyncOptions): Promise<{
  ftpConnected: boolean;
  ftpMessage: string;
  remoteFilesFound: string[];
  downloadedFiles: string[];
  importResults: ImportResult[];
}> {
  const cfg = getSyncConfig();
  const provider = options?.provider || cfg.provedor_ftp || 'VIXHOST';
  const clientFolder = (options?.clientFolder !== undefined ? options.clientFolder : cfg.pasta_cliente_ftp || '').trim();

  let host = options?.host || cfg.ftp_host;
  let port = options?.port || cfg.ftp_port || 21;
  let user = options?.user || cfg.ftp_user;
  let password = options?.password || cfg.ftp_password;
  let remoteDir = options?.remoteDir || cfg.ftp_dir || `cliente/${clientFolder}`;

  if (provider === 'VIXHOST') {
    host = FTP_PRESETS.VIXHOST.host;
    port = FTP_PRESETS.VIXHOST.port;
    user = FTP_PRESETS.VIXHOST.user;
    password = FTP_PRESETS.VIXHOST.password;
    remoteDir = `cliente/${clientFolder}`;
  } else if (provider === 'UOLHOST') {
    host = FTP_PRESETS.UOLHOST.host;
    port = FTP_PRESETS.UOLHOST.port;
    user = FTP_PRESETS.UOLHOST.user;
    password = FTP_PRESETS.UOLHOST.password;
    remoteDir = `cliente/${clientFolder}`;
  }

  const remoteFilesFound: string[] = [];
  const downloadedFiles: string[] = [];
  const importResults: ImportResult[] = [];

  // Local directory to store downloaded PBI zips
  const defaultDownloads = path.join(__dirname, '../../downloads');
  const downloadsDir = process.env.EPR_DATA_DIR
    ? path.join(process.env.EPR_DATA_DIR, '../downloads')
    : defaultDownloads;

  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }

  if (!host || !user || !password) {
    return {
      ftpConnected: false,
      ftpMessage: 'Credenciais de FTP não configuradas.',
      remoteFilesFound,
      downloadedFiles,
      importResults,
    };
  }

  const client = new ftp.Client();
  client.ftp.verbose = false;

  try {
    console.log(`[FTP] Conectando a ${host}:${port} (${provider})...`);
    await client.access({
      host,
      port: Number(port),
      user,
      password,
      secure: false,
    });

    if (provider === 'UOLHOST') {
      try { await client.cd('..'); } catch {}
      try { await client.cd('/'); } catch {}
    }

    const candidates = [
      remoteDir,
      `cliente/${clientFolder}`,
      `clientes/${clientFolder}`,
      clientFolder,
    ];

    let navigated = false;
    for (const dir of candidates) {
      if (!dir) continue;
      try {
        await client.cd(dir);
        navigated = true;
        console.log(`[FTP] Diretório acessado: ${dir}`);
        break;
      } catch {}
    }

    if (!navigated && clientFolder) {
      console.warn(`[FTP] Não foi possível navegar para nenhuma pasta de cliente esperada (${candidates.join(', ')})`);
    }

    const list = await client.list();
    const zipEntries = list.filter(item => isPbiZip(item.name));

    for (const item of zipEntries) {
      remoteFilesFound.push(item.name);
      const localZipPath = path.join(downloadsDir, item.name);

      // Checa se ja foi processado no banco antes de baixar
      const existingInDb = db.prepare(`SELECT status FROM pbi_arquivo WHERE nome_arquivo = ?`).get(item.name) as { status: string } | undefined;
      if (existingInDb && existingInDb.status === 'ATUALIZADA') {
        continue;
      }

      console.log(`[FTP] Baixando ${item.name} (${item.size} bytes)...`);
      await client.downloadTo(localZipPath, item.name);
      downloadedFiles.push(item.name);

      try {
        const result = await importPbiZip(localZipPath);
        importResults.push(result);
        if (result.success && (result.processedRecords || 0) > 0) {
          incrementSyncVersion();
        }
      } catch (err: any) {
        console.error(`[PBI Importer] Erro ao processar ${item.name}:`, err.message);
        importResults.push({
          success: false,
          filename: item.name,
          status: 'ERRO',
          message: `Erro de leitura do ZIP: ${err.message}`,
        });
      } finally {
        // Remove o arquivo baixado apos processamento para nao ocupar espaco em disco
        try {
          if (fs.existsSync(localZipPath)) {
            fs.unlinkSync(localZipPath);
          }
        } catch (_) {}
      }
    }

    client.close();

    return {
      ftpConnected: true,
      ftpMessage: `FTP conectado com sucesso! ${zipEntries.length} arquivo(s) PBI no FTP (${provider}).`,
      remoteFilesFound,
      downloadedFiles,
      importResults,
    };
  } catch (err: any) {
    console.error(`[FTP] Erro na conexão FTP (${host}):`, err.message);
    try { client.close(); } catch {}
    return {
      ftpConnected: false,
      ftpMessage: `Erro ao conectar no FTP (${host}): ${err.message}`,
      remoteFilesFound,
      downloadedFiles,
      importResults,
    };
  }
}

/**
 * Orquestrador completo: executa sincronização de pasta local e/ou FTP conforme configuração do sistema
 */
export async function runFullSync(options?: { localDir?: string; ftp?: FtpSyncOptions }): Promise<SyncSummary> {
  const cfg = getSyncConfig();
  const mode = cfg.modo_sincronizacao || 'FTP';

  let localRes: { dirScanned: string; filesFound: string[]; importResults: ImportResult[] } = {
    dirScanned: '',
    filesFound: [],
    importResults: [],
  };

  let ftpRes: {
    ftpConnected: boolean;
    ftpMessage: string;
    remoteFilesFound: string[];
    downloadedFiles: string[];
    importResults: ImportResult[];
  } = {
    ftpConnected: false,
    ftpMessage: 'FTP não executado para o modo atual.',
    remoteFilesFound: [],
    downloadedFiles: [],
    importResults: [],
  };

  if (mode === 'LOCAL' || mode === 'AMBOS') {
    localRes = await syncLocalPbiFolder(options?.localDir);
  }

  if (mode === 'FTP' || mode === 'AMBOS') {
    ftpRes = await syncPbiFromFtp(options?.ftp);
  }

  const combinedResults = [...localRes.importResults, ...ftpRes.importResults];

  return {
    success: true,
    message: `Sincronização concluída (${mode}). ${localRes.filesFound.length} arquivo(s) locais e ${ftpRes.downloadedFiles.length} baixados do FTP.`,
    localDirScanned: localRes.dirScanned,
    localFilesFound: localRes.filesFound,
    ftpConnected: ftpRes.ftpConnected,
    ftpMessage: ftpRes.ftpMessage,
    remoteFilesFound: ftpRes.remoteFilesFound,
    downloadedFiles: ftpRes.downloadedFiles,
    importResults: combinedResults,
  };
}

export async function syncPbiFolder(pbiDir: string): Promise<ImportResult[]> {
  const syncRes = await runFullSync({ localDir: pbiDir });
  return syncRes.importResults;
}

/**
 * File Watcher: Monitora a pasta local em tempo real
 */
let watcherInstance: fs.FSWatcher | null = null;
const debounceTimers = new Map<string, NodeJS.Timeout>();

export function startPbiDirectoryWatcher(targetDir?: string) {
  const cfg = getSyncConfig();
  const pbiDir = targetDir || cfg.pasta_local_pbi || process.env.LOCAL_PBI_DIR || path.join(__dirname, '../../../PBI');
  const resolvedPath = path.isAbsolute(pbiDir) ? pbiDir : path.resolve(process.cwd(), pbiDir);

  if (!fs.existsSync(resolvedPath)) {
    console.log(`[PBI Watcher] Pasta local não encontrada para monitoramento em tempo real: ${resolvedPath}`);
    return;
  }

  if (watcherInstance) {
    try { watcherInstance.close(); } catch {}
  }

  console.log(`[PBI Watcher] 👁️  Monitoramento em tempo real ATIVADO na pasta: ${resolvedPath}`);
  
  try {
    watcherInstance = fs.watch(resolvedPath, (eventType, filename) => {
      if (!filename || !filename.toLowerCase().endsWith('.zip')) return;

      const fullPath = path.join(resolvedPath, filename);

      if (debounceTimers.has(filename)) {
        clearTimeout(debounceTimers.get(filename)!);
      }

      debounceTimers.set(
        filename,
        setTimeout(async () => {
          debounceTimers.delete(filename);
          if (fs.existsSync(fullPath)) {
            console.log(`[PBI Watcher] ⚡ Novo arquivo detectado: ${filename}. Processando...`);
            try {
              const res = await importPbiZip(fullPath);
              console.log(`[PBI Watcher] ✅ ${filename}: ${res.status} (${res.processedRecords || 0} registros)`);
            } catch (err: any) {
              console.error(`[PBI Watcher] ❌ Erro ao processar ${filename}:`, err.message);
            }
          }
        }, 1500)
      );
    });
  } catch (err: any) {
    console.error(`[PBI Watcher] Erro ao iniciar watcher na pasta ${resolvedPath}:`, err.message);
  }
}


