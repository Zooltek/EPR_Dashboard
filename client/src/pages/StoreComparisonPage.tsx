import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { FilterState } from '../types';
import { Store, Award, ArrowUpDown } from 'lucide-react';

interface StoreComparisonPageProps {
  filters: FilterState;
}

interface StoreMetrics {
  rank: number;
  lojaId: number;
  lojaNome: string;
  cnpj: string;
  faturamento: number;
  vendas: number;
  ticketMedio: number;
  itens: number;
  totalDesconto: number;
  margemEstimada: number;
  margemPct: number;
}

export const StoreComparisonPage: React.FC<StoreComparisonPageProps> = ({ filters }) => {
  const [stores, setStores] = useState<StoreMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState<keyof StoreMetrics>('faturamento');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.period) params.append('period', filters.period);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    api.get(`/api/dashboard/store-comparison?${params.toString()}`)
      .then(res => setStores(res.data.stores || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [filters]);

  const handleSort = (field: keyof StoreMetrics) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedStores = [...stores].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortAsc ? valA - valB : valB - valA;
    }
    return sortAsc
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('pt-BR').format(val || 0);
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando comparativo entre lojas...</div>;
  }

  return (
    <div className="page-body">
      <div className="charts-grid">
        <div className="chart-card col-12">
          <div className="chart-header">
            <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Store size={20} color="var(--primary)" /> Matriz Comparativa e Ranking entre Lojas
            </span>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('rank')}>
                    Posição <ArrowUpDown size={12} />
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('lojaNome')}>
                    Loja / CNPJ <ArrowUpDown size={12} />
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('faturamento')}>
                    Faturamento <ArrowUpDown size={12} />
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('vendas')}>
                    Vendas <ArrowUpDown size={12} />
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('ticketMedio')}>
                    Ticket Médio <ArrowUpDown size={12} />
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('itens')}>
                    Itens Vendidos <ArrowUpDown size={12} />
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('totalDesconto')}>
                    Descontos <ArrowUpDown size={12} />
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('margemEstimada')}>
                    Margem Est. (R$) <ArrowUpDown size={12} />
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('margemPct')}>
                    Margem % <ArrowUpDown size={12} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedStores.map((s, index) => (
                  <tr key={s.lojaId}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                        {index === 0 && <Award size={16} color="var(--warning)" />}
                        {index === 1 && <Award size={16} color="#94a3b8" />}
                        {index === 2 && <Award size={16} color="#b45309" />}
                        <span>{index + 1}º</span>
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong>{s.lojaNome}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>CNPJ: {s.cnpj}</div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem' }}>
                      {formatCurrency(s.faturamento)}
                    </td>
                    <td>{formatNumber(s.vendas)}</td>
                    <td>{formatCurrency(s.ticketMedio)}</td>
                    <td>{formatNumber(s.itens)}</td>
                    <td style={{ color: 'var(--warning)' }}>{formatCurrency(s.totalDesconto)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(s.margemEstimada)}</td>
                    <td>
                      <span className="kpi-badge up">{s.margemPct.toFixed(1)}%</span>
                    </td>
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
