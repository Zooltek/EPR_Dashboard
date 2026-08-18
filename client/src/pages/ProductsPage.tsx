import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { FilterState } from '../types';
import { Package, AlertTriangle, Layers, DollarSign, Tag, ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface ProductsPageProps {
  filters: FilterState;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({ filters }) => {
  const [data, setData] = useState<{
    kpis: {
      total_produtos: number;
      total_estoque: number;
      valor_estoque_custo: number;
      valor_estoque_venda: number;
      produtos_sem_estoque: number;
      estoque_baixo: number;
    };
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    ruptureList: { ref_id: string; produto: string; marca: string; tamanho: string; cor: string; qtd: number }[];
  } | null>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', '10'); // 10 itens por página
    if (filters.lojaId) params.append('lojaId', filters.lojaId);
    if (search.trim()) params.append('search', search.trim());

    api.get(`/api/dashboard/products?${params.toString()}`)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [filters, page, search]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('pt-BR').format(val || 0);
  };

  const kpis = data?.kpis || {
    total_produtos: 0,
    total_estoque: 0,
    valor_estoque_custo: 0,
    valor_estoque_venda: 0,
    produtos_sem_estoque: 0,
    estoque_baixo: 0,
  };
  const ruptureList = data?.ruptureList || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="page-body">
      {/* Stock KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Produtos Cadastrados</span>
            <div className="kpi-icon"><Package size={18} /></div>
          </div>
          <div className="kpi-value">{formatNumber(kpis.total_produtos)}</div>
          <div className="kpi-badge neutral">Itens no catálogo</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total em Estoque</span>
            <div className="kpi-icon"><Layers size={18} /></div>
          </div>
          <div className="kpi-value">{formatNumber(kpis.total_estoque)}</div>
          <div className="kpi-badge neutral">Unidades físicas</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Valor Estoque (Custo)</span>
            <div className="kpi-icon" style={{ color: 'var(--info)', backgroundColor: 'rgba(59, 130, 246, 0.15)' }}><DollarSign size={18} /></div>
          </div>
          <div className="kpi-value">{formatCurrency(kpis.valor_estoque_custo)}</div>
          <div className="kpi-badge neutral">Custo investido</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Valor Estoque (Venda)</span>
            <div className="kpi-icon" style={{ color: 'var(--success)', backgroundColor: 'var(--success-light)' }}><Tag size={18} /></div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--success)' }}>{formatCurrency(kpis.valor_estoque_venda)}</div>
          <div className="kpi-badge neutral">Potencial de faturamento</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Sem Estoque (Zero)</span>
            <div className="kpi-icon" style={{ color: 'var(--danger)', backgroundColor: 'var(--danger-light)' }}><AlertTriangle size={18} /></div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--danger)' }}>{formatNumber(kpis.produtos_sem_estoque)}</div>
          <div className="kpi-badge down">Atenção para reposição</div>
        </div>
      </div>

      {/* Paginated Ruptura Table with Real-time Search */}
      <div className="charts-grid">
        <div className="chart-card col-12">
          <div className="chart-header" style={{ flexWrap: 'wrap', gap: 12 }}>
            <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={18} color="var(--primary)" /> Análise de Ruptura e Grade de Estoque
            </span>

            {/* Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '6px 12px', flex: '1 1 200px', maxWidth: '100%' }}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Buscar por código, produto ou marca..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  width: '100%',
                }}
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); setPage(1); }}
                  style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ref ID</th>
                  <th>Produto</th>
                  <th>Marca</th>
                  <th>Cor</th>
                  <th>Tamanho</th>
                  <th>Qtd Estoque</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20 }}>Carregando produtos...</td></tr>
                ) : ruptureList.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20 }}>Nenhum produto encontrado.</td></tr>
                ) : (
                  ruptureList.map((r, idx) => (
                    <tr key={idx}>
                      <td><code>{r.ref_id}</code></td>
                      <td><strong>{r.produto}</strong></td>
                      <td>{r.marca || '-'}</td>
                      <td>{r.cor || '-'}</td>
                      <td><span className="kpi-badge neutral">Tam {r.tamanho}</span></td>
                      <td style={{ fontWeight: 700 }}>{r.qtd} un</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="pagination-container">
            <div>
              Exibindo página <strong>{page}</strong> de <strong>{totalPages}</strong> ({data?.total || 0} produtos no total)
            </div>
            <div className="pagination-controls">
              <button 
                className="btn-page" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft size={16} /> Anterior
              </button>
              
              <span className="page-number active">{page}</span>

              <button 
                className="btn-page" 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Próximo <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
