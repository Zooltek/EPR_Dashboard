import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Store, Edit2, Check, X } from 'lucide-react';

export const EmpresasPage: React.FC = () => {
  const [lojas, setLojas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editErpId, setEditErpId] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchLojas = () => {
    setLoading(true);
    api.get('/api/admin/lojas')
      .then(res => setLojas(res.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLojas();
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

  return (
    <div className="page-body">
      <div className="charts-grid">
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
