import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { FileCheck, RefreshCw, UploadCloud, CheckCircle2, AlertCircle, FileArchive } from 'lucide-react';

export const PbiFilesPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [syncConfig, setSyncConfig] = useState<{ modo_sincronizacao?: 'FTP' | 'LOCAL' | 'AMBOS'; pasta_local_pbi?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchLogs = () => {
    setLoading(true);
    api.get('/api/admin/pbi-files')
      .then(res => setLogs(res.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const fetchConfig = () => {
    api.get('/api/admin/config-sync')
      .then(res => setSyncConfig(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchLogs();
    fetchConfig();

    const handleSync = () => {
      fetchLogs();
      fetchConfig();
    };
    window.addEventListener('pbi_sync_completed', handleSync);
    return () => window.removeEventListener('pbi_sync_completed', handleSync);
  }, []);

  const handleManualSync = () => {
    setSyncing(true);
    setUploadFeedback(null);
    api.post('/api/admin/sync-pbi')
      .then(res => {
        const msg = res.data.message || `Sincronização executada com sucesso!`;
        setUploadFeedback({ type: 'success', message: msg });
        fetchLogs();
        window.dispatchEvent(new CustomEvent('pbi_sync_completed', { detail: res.data }));
      })
      .catch(err => {
        const errMsg = err.response?.data?.error || err.message;
        setUploadFeedback({ type: 'error', message: `Erro na sincronização: ${errMsg}` });
      })
      .finally(() => setSyncing(false));
  };

  const handleUploadFiles = async (files: FileList | File[]) => {
    const zipFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.zip') && f.name.toLowerCase().startsWith('pbi'));
    if (zipFiles.length === 0) {
      setUploadFeedback({ type: 'error', message: 'Selecione apenas arquivos de dados PBI compactados (ex: PBI_CNPJ_DATA_HORA.zip)' });
      return;
    }

    setUploading(true);
    setUploadFeedback(null);

    const formData = new FormData();
    zipFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const res = await api.post('/api/admin/upload-pbi', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const processedCount = res.data.results?.filter((r: any) => r.success)?.length || 0;
      setUploadFeedback({
        type: 'success',
        message: `${processedCount} de ${zipFiles.length} arquivo(s) processado(s) com sucesso na base de dados!`,
      });
      fetchLogs();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message;
      setUploadFeedback({ type: 'error', message: `Erro no upload: ${errMsg}` });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="page-body">
      {/* Direct Upload Area */}
      <div className="charts-grid">
        <div className="chart-card col-12">
          <div className="chart-header">
            <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UploadCloud size={20} color="var(--primary)" /> Upload Direto de Pacotes PBI (.zip)
            </span>
          </div>

          <div
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files) handleUploadFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragOver ? 'var(--primary)' : 'var(--border-color)'}`,
              backgroundColor: isDragOver ? 'var(--primary-light)' : 'var(--bg-card-hover)',
              borderRadius: 12,
              padding: '30px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept=".zip"
              style={{ display: 'none' }}
              onChange={e => {
                if (e.target.files && e.target.files.length > 0) {
                  handleUploadFiles(e.target.files);
                }
              }}
            />

            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: 'var(--primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
            }}>
              {uploading ? (
                <RefreshCw size={26} className="spin" />
              ) : (
                <FileArchive size={26} />
              )}
            </div>

            <div>
              <p style={{ fontWeight: 600, fontSize: '0.95rem', margin: 0, color: 'var(--text-main)' }}>
                {uploading ? 'Processando arquivos PBI...' : 'Arraste os arquivos .zip aqui ou clique para selecionar'}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Suporta múltiplos arquivos simultâneos (ex: <code>PBI_11235753000283_20260818_125103.zip</code>)
              </p>
            </div>
          </div>

          {/* Feedback banner */}
          {uploadFeedback && (
            <div style={{
              marginTop: 12,
              padding: '10px 14px',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: '0.85rem',
              backgroundColor: uploadFeedback.type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
              color: uploadFeedback.type === 'success' ? 'var(--success)' : 'var(--danger)',
              border: `1px solid ${uploadFeedback.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
            }}>
              {uploadFeedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{uploadFeedback.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="charts-grid">
        <div className="chart-card col-12">
          <div className="chart-header">
            <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileCheck size={20} color="var(--primary)" /> Histórico de Arquivos PBI e Processamento de Cargas
            </span>

            <button 
              className="btn-primary" 
              onClick={handleManualSync} 
              disabled={syncing}
              title={
                syncConfig?.modo_sincronizacao === 'LOCAL'
                  ? `Escanear pasta local configurada (${syncConfig.pasta_local_pbi || 'PBI'}) por novos arquivos .zip`
                  : syncConfig?.modo_sincronizacao === 'AMBOS'
                  ? 'Sincronizar tanto a pasta local quanto o servidor FTP'
                  : 'Sincronizar arquivos PBI via FTP'
              }
            >
              <RefreshCw size={14} className={syncing ? 'spin' : ''} />
              <span>
                {syncing
                  ? 'Sincronizando...'
                  : syncConfig?.modo_sincronizacao === 'LOCAL'
                  ? 'Verificar Pasta Local / Rede'
                  : syncConfig?.modo_sincronizacao === 'AMBOS'
                  ? 'Sincronizar FTP & Pasta Local'
                  : 'Verificar / Sincronizar FTP'}
              </span>
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome do Arquivo PBI</th>
                  <th>CNPJ Extraído</th>
                  <th>Loja Identificada</th>
                  <th>Data/Hora PBI</th>
                  <th>Tamanho</th>
                  <th>Status</th>
                  <th>Data Processamento</th>
                  <th>Registros</th>
                  <th>Observações / Mensagem</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 20 }}>Carregando logs...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 20 }}>Nenhum arquivo PBI registrado até o momento.</td></tr>
                ) : (
                  logs.map(log => {
                    const statusClass = log.status.toLowerCase();
                    return (
                      <tr key={log.id}>
                        <td><code>{log.nome_arquivo}</code></td>
                        <td><strong>{log.cnpj_loja}</strong></td>
                        <td>{log.loja_nome || <span style={{ color: 'var(--text-dim)' }}>Não vinculada</span>}</td>
                        <td>{log.data_pbi} {log.hora_pbi}</td>
                        <td>{formatBytes(log.tamanho_bytes)}</td>
                        <td>
                          <span className={`badge-status ${statusClass}`}>
                            {log.status}
                          </span>
                        </td>
                        <td>{log.data_processamento || '-'}</td>
                        <td><strong>{log.qtd_registros}</strong></td>
                        <td style={{ color: log.mensagem_erro ? 'var(--danger)' : 'var(--text-muted)' }}>
                          {log.mensagem_erro || 'Processado com sucesso'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
