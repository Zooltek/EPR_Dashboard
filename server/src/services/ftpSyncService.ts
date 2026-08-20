import fs from 'fs';
import path from 'path';
import * as ftp from 'basic-ftp';
import dotenv from 'dotenv';
import { db } from '../db/database';
import { importPbiZip, ImportResult } from './pbiImporter';

dotenv.config();

export function getFtpPresets() {
  return {
    VIXHOST: {
      name: 'VixHost',
      host: process.env.FTP_VIXHOST_HOST || process.env.FTP_HOST || 'ftp.consuldatasistemas.com.br',
      port: Number(process.env.FTP_VIXHOST_PORT || process.env.FTP_PORT || 21),
      user: process.env.FTP_VIXHOST_USER || process.env.FTP_USER || 'consuldata',
      password: process.env.FTP_VIXHOST_PASSWORD || process.env.FTP_PASSWORD || '',
      baseDir: 'cliente',
    },
    UOLHOST: {
      name: 'UOLHost',
      host: process.env.FTP_UOLHOST_HOST || 'ftp.sistemaplenus.com.br',
      port: Number(process.env.FTP_UOLHOST_PORT || 21),
      user: process.env.FTP_UOLHOST_USER || 'sistemaplenus',
      password: process.env.FTP_UOLHOST_PASSWORD || '',
      baseDir: 'cliente',
    },
  };
}

export const FTP_PRESETS = getFtpPresets();

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
  const presets = getFtpPresets();
  try {
    const row = db.prepare(`SELECT * FROM configuracao_sync WHERE id = 1`).get() as any;
    if (row) {
      const provider = (row.provedor_ftp || 'VIXHOST') as 'VIXHOST' | 'UOLHOST';
      const presetPass = presets[provider]?.password || '';
      return {
        ...row,
        ftp_password: row.ftp_password || presetPass,
        auto_sync_ativo: Number(row.auto_sync_ativo),
        intervalo_minutos: Number(row.intervalo_minutos),
        ftp_port: Number(row.ftp_port || 21),
      };
    }
  } catch (err) {
    console.error('[ConfigSync] Erro ao carregar do banco:', err);
  }

  const vix = presets.VIXHOST;
  return {
    modo_sincronizacao: 'FTP',
    provedor_ftp: 'VIXHOST',
    pasta_cliente_ftp: 'fabricio',
    ftp_host: vix.host,
    ftp_port: vix.port,
    ftp_user: vix.user,
    ftp_password: vix.password,
    ftp_dir: 'cliente/fabricio',
    pasta_local_pbi: '',
    intervalo_minutos: 5,
    auto_sync_ativo: 1,
  };
}

export function saveSyncConfig(cfg: Partial<SyncConfig>): SyncConfig {
  const current = getSyncConfig();
  const updated: SyncConfig = { ...current, ...cfg };
  const presets = getFtpPresets();

  // Calculate ftp_dir automatically if using standard presets
  if (updated.provedor_ftp === 'VIXHOST') {
    updated.ftp_host = presets.VIXHOST.host;
    updated.ftp_port = presets.VIXHOST.port;
    updated.ftp_user = presets.VIXHOST.user;
    updated.ftp_password = updated.ftp_password || presets.VIXHOST.password;
    updated.ftp_dir = `cliente/${(updated.pasta_cliente_ftp || '').trim()}`;
  } else if (updated.provedor_ftp === 'UOLHOST') {
    updated.ftp_host = presets.UOLHOST.host;
    updated.ftp_port = presets.UOLHOST.port;
    updated.ftp_user = presets.UOLHOST.user;
    updated.ftp_password = updated.ftp_password || presets.UOLHOST.password;
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

  // Restart scheduler & watcher immediately with the updated configuration
  restartSyncScheduler();

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
 * Processa todos os arquivos .zip de um diretório local ou de rede
 */
export async function syncLocalPbiFolder(targetDir?: string): Promise<{
  dirScanned: string;
  filesFound: string[];
  importResults: ImportResult[];
}> {
  const cfg = getSyncConfig();
  let rawDir = (targetDir || cfg.pasta_local_pbi || process.env.LOCAL_PBI_DIR || path.join(__dirname, '../../../PBI')).trim();
  
  // Remove aspas caso o usuário tenha colado caminho com aspas (ex: "C:\pasta" ou 'C:\pasta')
  if ((rawDir.startsWith('"') && rawDir.endsWith('"')) || (rawDir.startsWith("'") && rawDir.endsWith("'"))) {
    rawDir = rawDir.slice(1, -1).trim();
  }

  // Tratamento para caminhos de rede UNC (ex: \\servidor\pasta) ou caminhos absolutos/relativos
  const isUncPath = rawDir.startsWith('\\\\') || rawDir.startsWith('//');
  const resolvedPath = isUncPath ? rawDir : (path.isAbsolute(rawDir) ? path.normalize(rawDir) : path.resolve(process.cwd(), rawDir));

  const filesFound: string[] = [];
  const importResults: ImportResult[] = [];

  if (!fs.existsSync(resolvedPath)) {
    console.log(`[PBI Local] Diretório não encontrado: ${resolvedPath}`);
    return { dirScanned: resolvedPath, filesFound, importResults };
  }

  console.log(`[PBI Local] 🔍 Escaneando pasta local por arquivos PBI: ${resolvedPath}`);
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(resolvedPath);
  } catch (err: any) {
    console.error(`[PBI Local] Erro ao listar diretório ${resolvedPath}:`, err.message);
    return { dirScanned: resolvedPath, filesFound, importResults };
  }
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

  const presets = getFtpPresets();
  if (provider === 'VIXHOST') {
    host = presets.VIXHOST.host;
    port = presets.VIXHOST.port;
    user = presets.VIXHOST.user;
    password = password || presets.VIXHOST.password;
    remoteDir = `cliente/${clientFolder}`;
  } else if (provider === 'UOLHOST') {
    host = presets.UOLHOST.host;
    port = presets.UOLHOST.port;
    user = presets.UOLHOST.user;
    password = password || presets.UOLHOST.password;
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

  const presets = getFtpPresets();
  if (provider === 'VIXHOST') {
    host = presets.VIXHOST.host;
    port = presets.VIXHOST.port;
    user = presets.VIXHOST.user;
    password = password || presets.VIXHOST.password;
    remoteDir = `cliente/${clientFolder}`;
  } else if (provider === 'UOLHOST') {
    host = presets.UOLHOST.host;
    port = presets.UOLHOST.port;
    user = presets.UOLHOST.user;
    password = password || presets.UOLHOST.password;
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

  let modeSummaryMsg = '';
  if (mode === 'LOCAL') {
    modeSummaryMsg = `Sincronização de Pasta Local concluída. ${localRes.filesFound.length} arquivo(s) encontrado(s) em "${localRes.dirScanned}".`;
  } else if (mode === 'FTP') {
    modeSummaryMsg = `Sincronização FTP concluída. ${ftpRes.downloadedFiles.length} arquivo(s) baixado(s) e processado(s).`;
  } else {
    modeSummaryMsg = `Sincronização híbrida (Local & FTP) concluída. ${localRes.filesFound.length} local(is) e ${ftpRes.downloadedFiles.length} do FTP.`;
  }

  return {
    success: true,
    message: modeSummaryMsg,
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
  let rawDir = (targetDir || cfg.pasta_local_pbi || process.env.LOCAL_PBI_DIR || path.join(__dirname, '../../../PBI')).trim();
  
  if ((rawDir.startsWith('"') && rawDir.endsWith('"')) || (rawDir.startsWith("'") && rawDir.endsWith("'"))) {
    rawDir = rawDir.slice(1, -1).trim();
  }

  const isUncPath = rawDir.startsWith('\\\\') || rawDir.startsWith('//');
  const resolvedPath = isUncPath ? rawDir : (path.isAbsolute(rawDir) ? path.normalize(rawDir) : path.resolve(process.cwd(), rawDir));

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
              if (res.success && (res.processedRecords || 0) > 0) {
                incrementSyncVersion();
              }
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

/**
 * Agendador Periódico Dinâmico (Sincronização em Background)
 */
let syncIntervalTimer: NodeJS.Timeout | null = null;

export function restartSyncScheduler() {
  if (syncIntervalTimer) {
    clearInterval(syncIntervalTimer);
    syncIntervalTimer = null;
  }

  const cfg = getSyncConfig();
  const intervalMinutes = Number(cfg.intervalo_minutos) || 5;
  const isAutoSyncActive = cfg.auto_sync_ativo !== 0;

  console.log(`[Sync Scheduler] Configurando agendador: Modo=${cfg.modo_sincronizacao}, Ativo=${isAutoSyncActive}, Intervalo=${intervalMinutes} min, PastaLocal="${cfg.pasta_local_pbi || ''}"`);

  // Start real-time file watcher if local folder is specified and mode is LOCAL or AMBOS
  if ((cfg.modo_sincronizacao === 'LOCAL' || cfg.modo_sincronizacao === 'AMBOS') && cfg.pasta_local_pbi) {
    startPbiDirectoryWatcher(cfg.pasta_local_pbi);
  }

  if (isAutoSyncActive && intervalMinutes > 0) {
    const intervalMs = intervalMinutes * 60 * 1000;
    console.log(`[Sync Scheduler] ⏱️ Agendador periódico ativo: sincronizando a cada ${intervalMinutes} minuto(s) (${intervalMs}ms).`);
    
    syncIntervalTimer = setInterval(() => {
      console.log(`[Sync Scheduler] 🚀 Disparando varredura periódica automática (${new Date().toLocaleTimeString('pt-BR')})...`);
      runFullSync()
        .then(res => {
          console.log(`[Sync Scheduler] Concluído: ${res.message}`);
          if (res.importResults.some(r => r.status === 'ATUALIZADA' && (r.processedRecords || 0) > 0)) {
            console.log(`[Sync Scheduler] Novos registros integrados à base de dados.`);
          }
        })
        .catch(err => console.error('[Sync Scheduler] Erro na varredura periódica:', err.message));
    }, intervalMs);
  } else {
    console.log(`[Sync Scheduler] Sincronização periódica desativada (auto_sync_ativo=${cfg.auto_sync_ativo}).`);
  }
}


