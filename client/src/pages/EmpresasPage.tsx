import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { 
  Store, 
  Edit2, 
  Check, 
  X, 
  Settings, 
  Folder, 
  Server, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Save,
  Database,
  Download
} from 'lucide-react';

interface SyncConfig {
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
}

export const EmpresasPage: React.FC = () => {
  const [lojas, setLojas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editErpId, setEditErpId] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync Settings State
  const [config, setConfig] = useState<SyncConfig>({
    modo_sincronizacao: 'FTP',
    provedor_ftp: 'VIXHOST',
    pasta_cliente_ftp: 'fabricio',
    pasta_local_pbi: '',
    intervalo_minutos: 5,
    auto_sync_ativo: 1,
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingFtp, setTestingFtp] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; filesFound?: string[] } | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const fetchLojas = () => {
    setLoading(true);
    api.get('/api/admin/lojas')
      .then(res => setLojas(res.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const fetchConfig = () => {
    api.get('/api/admin/config-sync')
      .then(res => {
        if (res.data) setConfig(res.data);
      })
      .catch(err => console.error('Erro ao buscar configuracoes:', err));
  };

  useEffect(() => {
    fetchLojas();
    fetchConfig();
  }, []);

  const handleStartEdit = (loja: any) => {
    setEditingId(loja.id);
    setEditNome(loja.nome);
    setEditErpId(String(loja.id_loja_erp || '1'));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditNome('');
    setEditErpId('');
  };

  const handleSaveEdit = (id: number) => {
    if (!editNome.trim()) return;
    setSaving(true);
    api.put(`/api/admin/lojas/${id}`, {
      nome: editNome.trim(),
      id_loja_erp: Number(editErpId) || 1,
    })
      .then(() => {
        setEditingId(null);
        fetchLojas();
      })
      .catch(err => alert(`Erro ao salvar: ${err.message}`))
      .finally(() => setSaving(false));
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setSaveSuccessMsg('');
    setTestResult(null);

    api.post('/api/admin/config-sync', config)
      .then(res => {
        if (res.data?.config) setConfig(res.data.config);
        setSaveSuccessMsg('Configurações salvas e aplicadas com sucesso!');
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      })
      .catch(err => alert(`Erro ao salvar configurações: ${err.message}`))
      .finally(() => setSavingConfig(false));
  };

  const handleTestFtp = () => {
    setTestingFtp(true);
    setTestResult(null);

    api.post('/api/admin/test-ftp', {
      provider: config.provedor_ftp,
      clientFolder: config.pasta_cliente_ftp,
      host: config.ftp_host,
      port: config.ftp_port,
      user: config.ftp_user,
      password: config.ftp_password,
    })
      .then(res => {
        setTestResult(res.data);
      })
      .catch(err => {
        setTestResult({
          success: false,
          message: err.response?.data?.message || err.message,
        });
      })
      .finally(() => setTestingFtp(false));
  };

  return (
    <div className="page-body">
      <div className="charts-grid">
        
        {/* Card 1: Configuração de Sincronização e Conexão */}
        <div className="chart-card col-12" style={{ marginBottom: 24 }}>
          <div className="chart-header">
            <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Settings size={20} color="var(--primary)" /> Configurações de Origem dos Arquivos PBI (.zip)
            </span>
          </div>

          <form onSubmit={handleSaveConfig} style={{ padding: '8px 4px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
              
              {/* Modo de Sincronização */}
              <div style={{ background: 'var(--bg-body)', padding: 16, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                <label style={{ fontWeight: 700, fontSize: '0.9rem', display: 'block', marginBottom: 12, color: 'var(--text-main)' }}>
                  Modo de Operação:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input 
                      type="radio" 
                      name="modo" 
                      checked={config.modo_sincronizacao === 'FTP'} 
                      onChange={() => setConfig({ ...config, modo_sincronizacao: 'FTP' })} 
                    />
                    <span><strong>Servidor FTP</strong> (Download automático)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input 
                      type="radio" 
                      name="modo" 
                      checked={config.modo_sincronizacao === 'LOCAL'} 
                      onChange={() => setConfig({ ...config, modo_sincronizacao: 'LOCAL' })} 
                    />
                    <span><strong>Pasta Local / Rede</strong> (Consumo direto de diretório)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input 
                      type="radio" 
                      name="modo" 
                      checked={config.modo_sincronizacao === 'AMBOS'} 
                      onChange={() => setConfig({ ...config, modo_sincronizacao: 'AMBOS' })} 
                    />
                    <span><strong>Ambos</strong> (FTP + Pasta Local)</span>
                  </label>
                </div>
              </div>

              {/* Provedor de FTP */}
              {(config.modo_sincronizacao === 'FTP' || config.modo_sincronizacao === 'AMBOS') && (
                <div style={{ background: 'var(--bg-body)', padding: 16, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.9rem', display: 'block', marginBottom: 12, color: 'var(--text-main)' }}>
                    Provedor FTP do Cliente:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input 
                        type="radio" 
                        name="provedor" 
                        checked={config.provedor_ftp === 'VIXHOST'} 
                        onChange={() => setConfig({ ...config, provedor_ftp: 'VIXHOST' })} 
                      />
                      <span><strong>VixHost</strong></span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input 
                        type="radio" 
                        name="provedor" 
                        checked={config.provedor_ftp === 'UOLHOST'} 
                        onChange={() => setConfig({ ...config, provedor_ftp: 'UOLHOST' })} 
                      />
                      <span><strong>UOLHost</strong></span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input 
                        type="radio" 
                        name="provedor" 
                        checked={config.provedor_ftp === 'CUSTOM'} 
                        onChange={() => setConfig({ ...config, provedor_ftp: 'CUSTOM' })} 
                      />
                      <span><strong>Personalizado</strong> (Host próprio)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Intervalo de Agendamento */}
              <div style={{ background: 'var(--bg-body)', padding: 16, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                <label style={{ fontWeight: 700, fontSize: '0.9rem', display: 'block', marginBottom: 12, color: 'var(--text-main)' }}>
                  Varredura Automática:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                    <input 
                      type="checkbox" 
                      checked={config.auto_sync_ativo === 1} 
                      onChange={e => setConfig({ ...config, auto_sync_ativo: e.target.checked ? 1 : 0 })} 
                    />
                    <span>Ativar sincronização periódica automática</span>
                  </label>

                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Intervalo:</span>
                    <select
                      value={config.intervalo_minutos || 5}
                      onChange={e => setConfig({ ...config, intervalo_minutos: Number(e.target.value) })}
                      style={{ width: '100%', marginTop: 4, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                    >
                      <option value={1}>A cada 1 minuto</option>
                      <option value={5}>A cada 5 minutos (Recomendado)</option>
                      <option value={10}>A cada 10 minutos</option>
                      <option value={15}>A cada 15 minutos</option>
                      <option value={30}>A cada 30 minutos</option>
                      <option value={60}>A cada 1 hora</option>
                    </select>
                  </div>
                </div>
              </div>

            </div>

            {/* Linha de Detalhes dos Campos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 20 }}>
              
              {/* Pasta do Cliente no FTP */}
              {(config.modo_sincronizacao === 'FTP' || config.modo_sincronizacao === 'AMBOS') && (
                <div style={{ background: 'var(--bg-body)', padding: 16, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-main)', marginBottom: 6 }}>
                    <Server size={16} color="var(--primary)" />
                    Pasta do Cliente no FTP:
                  </label>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 8px 0' }}>
                    Nome da subpasta atribuída ao cliente (ex: <code>fabricio</code> ou <code>loja01</code>). Caminho final: <code>cliente/{config.pasta_cliente_ftp || 'nome_pasta'}</code>
                  </p>
                  <input
                    type="text"
                    placeholder="Ex: fabricio"
                    value={config.pasta_cliente_ftp || ''}
                    onChange={e => setConfig({ ...config, pasta_cliente_ftp: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                  />

                  {config.provedor_ftp === 'CUSTOM' && (
                    <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Host FTP:</span>
                        <input
                          type="text"
                          value={config.ftp_host || ''}
                          onChange={e => setConfig({ ...config, ftp_host: e.target.value })}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Porta:</span>
                        <input
                          type="number"
                          value={config.ftp_port || 21}
                          onChange={e => setConfig({ ...config, ftp_port: Number(e.target.value) })}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Usuário:</span>
                        <input
                          type="text"
                          value={config.ftp_user || ''}
                          onChange={e => setConfig({ ...config, ftp_user: e.target.value })}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Senha:</span>
                        <input
                          type="password"
                          value={config.ftp_password || ''}
                          onChange={e => setConfig({ ...config, ftp_password: e.target.value })}
                          style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pasta Local / Rede */}
              {(config.modo_sincronizacao === 'LOCAL' || config.modo_sincronizacao === 'AMBOS') && (
                <div style={{ background: 'var(--bg-body)', padding: 16, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                  <label style={{ fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-main)', marginBottom: 6 }}>
                    <Folder size={16} color="var(--primary)" />
                    Caminho da Pasta Local dos Arquivos PBI:
                  </label>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 8px 0' }}>
                    O sistema monitora este diretório em tempo real para importar novos arquivos <code>.zip</code> salvos pelo ERP.
                  </p>
                  <input
                    type="text"
                    placeholder="Ex: C:\Consuldata\PBI ou D:\EPR_Arquivos"
                    value={config.pasta_local_pbi || ''}
                    onChange={e => setConfig({ ...config, pasta_local_pbi: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                  />
                </div>
              )}

            </div>

            {/* Teste de Conexão e Resultados */}
            {testResult && (
              <div style={{ 
                marginTop: 16, 
                padding: '12px 16px', 
                borderRadius: 8, 
                background: testResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${testResult.success ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12
              }}>
                {testResult.success ? (
                  <CheckCircle2 size={20} color="#22c55e" style={{ flexShrink: 0, marginTop: 2 }} />
                ) : (
                  <AlertCircle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                )}
                <div>
                  <strong style={{ color: testResult.success ? '#22c55e' : '#ef4444', fontSize: '0.9rem' }}>
                    {testResult.success ? 'Teste de Conexão Bem-Sucedido' : 'Falha na Conexão'}
                  </strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-main)' }}>
                    {testResult.message}
                  </p>
                  {testResult.filesFound && testResult.filesFound.length > 0 && (
                    <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Arquivos encontrados: {testResult.filesFound.slice(0, 5).join(', ')} {testResult.filesFound.length > 5 ? `(+${testResult.filesFound.length - 5} arquivos)` : ''}
                    </p>
                  )}
                </div>
              </div>
            )}

            {saveSuccessMsg && (
              <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.4)', color: '#22c55e', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={18} /> {saveSuccessMsg}
              </div>
            )}

            {/* Barra de Ações */}
            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {(config.modo_sincronizacao === 'FTP' || config.modo_sincronizacao === 'AMBOS') && (
                <button
                  type="button"
                  onClick={handleTestFtp}
                  disabled={testingFtp}
                  className="btn-page"
                  style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
                >
                  <RefreshCw size={14} className={testingFtp ? 'spin' : ''} />
                  {testingFtp ? 'Testando Conexão...' : 'Testar Conexão FTP'}
                </button>
              )}

              <button
                type="submit"
                disabled={savingConfig}
                className="btn-page active"
                style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600 }}
              >
                <Save size={15} />
                {savingConfig ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </form>
        </div>

        {/* Card 2: Backup e Segurança dos Dados Locais */}
        <div className="chart-card col-12" style={{ marginBottom: 24 }}>
          <div className="chart-header">
            <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Database size={20} color="var(--primary)" /> Backup e Segurança dos Dados Locais
            </span>
          </div>

          <div style={{ padding: '8px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>
                Cópia de Segurança Completa do Banco de Dados (.sqlite)
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Gera um arquivo de backup com todas as vendas, produtos, clientes, metas e configurações do sistema.
              </p>
            </div>

            <a
              href={`${api.defaults.baseURL || ''}/api/admin/backup-db`}
              download
              className="btn-page active"
              style={{ 
                padding: '10px 20px', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 8, 
                fontSize: '0.85rem', 
                fontWeight: 600,
                textDecoration: 'none',
                cursor: 'pointer'
              }}
            >
              <Download size={16} />
              Fazer Backup dos Dados
            </a>
          </div>
        </div>

        {/* Card 3: Cadastro e Unidades de Lojas */}
        <div className="chart-card col-12">
          <div className="chart-header">
            <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Store size={20} color="var(--primary)" /> Cadastro e Unidades de Lojas
            </span>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID ERP</th>
                  <th>Nome da Loja</th>
                  <th>CNPJ Único</th>
                  <th>Status</th>
                  <th style={{ width: 140, textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20 }}>Carregando lojas...</td></tr>
                ) : lojas.map(l => {
                  const isEditing = editingId === l.id;
                  return (
                    <tr key={l.id}>
                      <td>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editErpId}
                            onChange={e => setEditErpId(e.target.value)}
                            style={{ width: 70, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                          />
                        ) : (
                          <code>Loja #{l.id_loja_erp}</code>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editNome}
                            onChange={e => setEditNome(e.target.value)}
                            style={{ width: '100%', minWidth: 200, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                          />
                        ) : (
                          <strong>{l.nome}</strong>
                        )}
                      </td>
                      <td><code>{l.cnpj}</code></td>
                      <td><span className="badge-status atualizada">{l.status}</span></td>
                      <td style={{ textAlign: 'center' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <button
                              onClick={() => handleSaveEdit(l.id)}
                              disabled={saving}
                              className="btn-page active"
                              style={{ padding: '4px 8px' }}
                              title="Salvar"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="btn-page"
                              style={{ padding: '4px 8px' }}
                              title="Cancelar"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(l)}
                            className="btn-page"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            title="Editar Nome da Loja"
                          >
                            <Edit2 size={12} style={{ marginRight: 4 }} /> Editar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
