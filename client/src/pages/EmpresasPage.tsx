import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Store } from 'lucide-react';

export const EmpresasPage: React.FC = () => {
  const [lojas, setLojas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/api/admin/lojas')
      .then(res => setLojas(res.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

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
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4}>Carregando lojas...</td></tr>
                ) : lojas.map(l => (
                  <tr key={l.id}>
                    <td><code>Loja #{l.id_loja_erp}</code></td>
                    <td><strong>{l.nome}</strong></td>
                    <td><code>{l.cnpj}</code></td>
                    <td><span className="badge-status atualizada">{l.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
