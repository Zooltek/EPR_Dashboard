import fs from 'fs';
import path from 'path';
import * as ftp from 'basic-ftp';
import dotenv from 'dotenv';
import { importPbiZip, ImportResult } from './pbiImporter';

dotenv.config();

export interface FtpSyncOptions {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  remoteDir?: string;
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

/**
 * Processa todos os arquivos .zip de um diretório local (ex: C:\Consuldata\PBI ou ./PBI)
 */
export async function syncLocalPbiFolder(targetDir?: string): Promise<{
  dirScanned: string;
  filesFound: string[];
  importResults: ImportResult[];
}> {
  const pbiDir = targetDir || process.env.LOCAL_PBI_DIR || path.join(__dirname, '../../../PBI');
  const resolvedPath = path.isAbsolute(pbiDir) ? pbiDir : path.resolve(process.cwd(), pbiDir);

  const filesFound: string[] = [];
  const importResults: ImportResult[] = [];

  if (!fs.existsSync(resolvedPath)) {
    console.log(`[PBI Local] Diretório não encontrado: ${resolvedPath}`);
    return { dirScanned: resolvedPath, filesFound, importResults };
  }

  console.log(`[PBI Local] Escaneando pasta local por arquivos PBI: ${resolvedPath}`);
  const entries = fs.readdirSync(resolvedPath);
  const zipFiles = entries.filter(f => f.toLowerCase().endsWith('.zip'));

  for (const zip of zipFiles) {
    filesFound.push(zip);
    const fullPath = path.join(resolvedPath, zip);
    try {
      const res = await importPbiZip(fullPath);
      importResults.push(res);
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
 * Conecta ao FTP e baixa novos arquivos .zip para a pasta downloads
 */
export async function syncPbiFromFtp(options?: FtpSyncOptions): Promise<{
  ftpConnected: boolean;
  ftpMessage: string;
  remoteFilesFound: string[];
  downloadedFiles: string[];
  importResults: ImportResult[];
}> {
  const host = options?.host || process.env.FTP_HOST;
  const port = options?.port || parseInt(process.env.FTP_PORT || '21', 10);
  const user = options?.user || process.env.FTP_USER;
  const password = options?.password || process.env.FTP_PASSWORD;
  const rawRemoteDir = options?.remoteDir || process.env.FTP_DIR || 'clientes/fabricio';

  const normalizedRemoteDir = rawRemoteDir.replace(/\\/g, '/').replace(/^\/+/, '');

  const remoteFilesFound: string[] = [];
  const downloadedFiles: string[] = [];
  const importResults: ImportResult[] = [];

  // Local directory to store downloaded PBI zips
  const downloadsDir = path.join(__dirname, '../../downloads');
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
  }

  if (!host || !user || !password) {
    return {
      ftpConnected: false,
      ftpMessage: 'Credenciais de FTP não configuradas. Operando apenas com sincronização local.',
      remoteFilesFound,
      downloadedFiles,
      importResults,
    };
  }

  const client = new ftp.Client();
  client.ftp.verbose = false;

  try {
    console.log(`[FTP] Conectando ao servidor ${host}:${port} com usuário ${user}...`);
    await client.access({
      host,
      port,
      user,
      password,
      secure: false,
    });

    console.log(`[FTP] Conexão estabelecida com sucesso! Acessando diretório: ${normalizedRemoteDir}`);
    await client.cd(normalizedRemoteDir);

    const list = await client.list();
    const zipEntries = list.filter(item => item.name.toLowerCase().endsWith('.zip'));

    for (const item of zipEntries) {
      remoteFilesFound.push(item.name);
      const localZipPath = path.join(downloadsDir, item.name);

      let needsDownload = true;
      if (fs.existsSync(localZipPath)) {
        const localStats = fs.statSync(localZipPath);
        if (localStats.size === item.size && item.size > 0) {
          needsDownload = false;
        }
      }

      if (needsDownload) {
        console.log(`[FTP] Baixando ${item.name} (${item.size} bytes)...`);
        await client.downloadTo(localZipPath, item.name);
        downloadedFiles.push(item.name);
      }

      try {
        const result = await importPbiZip(localZipPath);
        importResults.push(result);
      } catch (err: any) {
        console.error(`[PBI Importer] Erro ao processar ${item.name}:`, err.message);
        importResults.push({
          success: false,
          filename: item.name,
          status: 'ERRO',
          message: `Erro de leitura do ZIP: ${err.message}`,
        });
      }
    }

    client.close();

    return {
      ftpConnected: true,
      ftpMessage: `FTP conectado com sucesso! ${zipEntries.length} arquivo(s) ZIP encontrado(s) no FTP.`,
      remoteFilesFound,
      downloadedFiles,
      importResults,
    };
  } catch (err: any) {
    console.error(`[FTP] Erro na conexão FTP:`, err.message);
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
 * Orquestrador completo: executa sincronização de pasta local e/ou FTP conforme configuração
 */
export async function runFullSync(options?: { localDir?: string; ftp?: FtpSyncOptions }): Promise<SyncSummary> {
  const localRes = await syncLocalPbiFolder(options?.localDir);
  const ftpRes = await syncPbiFromFtp(options?.ftp);

  const combinedResults = [...localRes.importResults, ...ftpRes.importResults];
  const totalFiles = localRes.filesFound.length + ftpRes.downloadedFiles.length;

  return {
    success: true,
    message: `Sincronização concluída. ${localRes.filesFound.length} arquivo(s) locais e ${ftpRes.downloadedFiles.length} arquivo(s) FTP processados.`,
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
 * File Watcher: Monitora a pasta local em tempo real para processar novos arquivos ZIP assim que o ERP salvar
 */
let watcherInstance: fs.FSWatcher | null = null;
const debounceTimers = new Map<string, NodeJS.Timeout>();

export function startPbiDirectoryWatcher(targetDir?: string) {
  const pbiDir = targetDir || process.env.LOCAL_PBI_DIR || path.join(__dirname, '../../../PBI');
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

      // Debounce de 1.5s para garantir que o ERP terminou de gravar o arquivo no disco
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

