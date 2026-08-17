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

  // 1. Check local sample PBI directory
  const localPbiDir = path.join(__dirname, '../../../PBI');
  if (fs.existsSync(localPbiDir)) {
    const localZips = fs.readdirSync(localPbiDir).filter(f => f.toLowerCase().endsWith('.zip'));
    for (const zip of localZips) {
      try {
        const res = await importPbiZip(path.join(localPbiDir, zip));
        importResults.push(res);
      } catch (e: any) {
        console.error(`Erro ao importar PBI local ${zip}:`, e.message);
      }
    }
  }

  if (!host || !user || !password) {
    return {
      ftpConnected: false,
      ftpMessage: 'Credenciais de FTP não informadas nas variáveis de ambiente.',
      remoteFilesFound,
      downloadedFiles,
      importResults,
    };
  }

  const client = new ftp.Client();
  client.ftp.verbose = true;

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
      console.log(`[FTP] Arquivo remoto localizado: ${item.name} (${item.size} bytes)`);

      const localZipPath = path.join(downloadsDir, item.name);

      // Re-download if file doesn't exist locally or local size doesn't match remote size
      let needsDownload = true;
      if (fs.existsSync(localZipPath)) {
        const localStats = fs.statSync(localZipPath);
        if (localStats.size === item.size && item.size > 0) {
          needsDownload = false;
        }
      }

      if (needsDownload) {
        console.log(`[FTP] Baixando ${item.name} (${item.size} bytes) para ${localZipPath}...`);
        await client.downloadTo(localZipPath, item.name);
        downloadedFiles.push(item.name);
      } else {
        console.log(`[FTP] Arquivo ${item.name} já baixado com tamanho correto (${item.size} bytes).`);
      }

      // Process downloaded PBI zip
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
    client.close();
    return {
      ftpConnected: false,
      ftpMessage: `Erro ao conectar no FTP (${host}): ${err.message}`,
      remoteFilesFound,
      downloadedFiles,
      importResults,
    };
  }
}

export async function syncPbiFolder(pbiDir: string): Promise<ImportResult[]> {
  const syncRes = await syncPbiFromFtp();
  return syncRes.importResults;
}
