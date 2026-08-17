import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FileCheck, RefreshCw } from 'lucide-react';

export const PbiFilesPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchLogs = () => {
    setLoading(true);
    axios.get('http://localhost:3001/api/admin/pbi-files')
      .then(res => setLogs(res.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleManualSync = () => {
    setSyncing(true);
    axios.post('http://localhost:3001/api/admin/sync-pbi')
      .then(res => {
        alert(`Sincronização executada! ${res.data.count} arquivo(s) verificado(s).`);
        fetchLogs();
      })
      .catch(err => alert(`Erro na sincronização: ${err.message}`))
      .finally(() => setSyncing(false));
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
      <div className="charts-grid">
        <div className="chart-card col-12">
          <div className="chart-header">
            <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileCheck size={20} color="var(--primary)" /> Histórico de Arquivos PBI e Processamento de Cargas
            </span>

            <button className="btn-primary" onClick={handleManualSync} disabled={syncing}>
              <RefreshCw size={14} className={syncing ? 'spin' : ''} />
              <span>{syncing ? 'Verificando FTP/PBI...' : 'Verificar / Sincronizar PBI'}</span>
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
