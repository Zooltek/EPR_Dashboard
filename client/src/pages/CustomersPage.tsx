import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { FilterState, OverviewData } from '../types';
import { Users, UserPlus, CreditCard, Award, Cake, Gift, ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface CustomersPageProps {
  overviewData: OverviewData | null;
  filters: FilterState;
}

interface CustomerRecord {
  id_cliente: number;
  nome: string;
  pessoa: string;
  cpf: string;
  cnpj: string;
  email: string;
  data_nasc: string;
  total_compras: number;
  faturamento_total: number;
}

interface BirthdayCustomer {
  id_cliente: number;
  nome: string;
  data_nasc: string;
  dia_aniversario: string;
  email: string;
  cpf: string;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({ overviewData, filters }) => {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [birthdayCustomers, setBirthdayCustomers] = useState<BirthdayCustomer[]>([]);
  const [birthdayCount, setBirthdayCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', '10');
    if (filters.period) params.append('period', filters.period);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (search.trim()) params.append('search', search.trim());

    api.get(`/api/dashboard/customers?${params.toString()}`)
      .then(res => {
        setCustomers(res.data.customers || []);
        setBirthdayCustomers(res.data.birthdayCustomers || []);
        setBirthdayCount(res.data.birthdayCount || 0);
        setTotalPages(res.data.totalPages || 1);
        setTotalCustomers(res.data.total || 0);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [filters, page, search]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('pt-BR').format(val || 0);
  };

  const kpis = overviewData?.kpis || { vendas: 0, ticketMedio: 0 };

  return (
    <div className="page-body">
      {/* Customer KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total de Clientes</span>
            <div className="kpi-icon"><Users size={18} /></div>
          </div>
          <div className="kpi-value">{formatNumber(totalCustomers)}</div>
          <div className="kpi-badge neutral">Base total</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Clientes Compradores</span>
            <div className="kpi-icon" style={{ color: 'var(--success)', backgroundColor: 'var(--success-light)' }}><UserPlus size={18} /></div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--success)' }}>{formatNumber(kpis.vendas)}</div>
          <div className="kpi-badge up">Ativos no período</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Ticket Médio / Cliente</span>
            <div className="kpi-icon"><CreditCard size={18} /></div>
          </div>
          <div className="kpi-value">{formatCurrency(kpis.ticketMedio)}</div>
          <div className="kpi-badge neutral">Gasto médio por compra</div>
        </div>

        {/* Card Aniversariantes do Período */}
        <div className="kpi-card" style={{ borderColor: 'var(--primary)' }}>
          <div className="kpi-header">
            <span className="kpi-title" style={{ color: 'var(--primary)', fontWeight: 700 }}>Aniversariantes no Período</span>
            <div className="kpi-icon" style={{ color: '#fff', backgroundColor: 'var(--primary)' }}><Cake size={18} /></div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--primary)' }}>{birthdayCount}</div>
          <div className="kpi-badge up" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
            🎉 Fazer aniversário no período filtrado
          </div>
        </div>
      </div>

      {/* Tabela de Aniversariantes do Período Selecionado */}
      <div className="charts-grid">
        <div className="chart-card col-12" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div className="chart-header">
            <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)' }}>
              <Gift size={20} color="var(--primary)" /> Aniversariantes do Período Selecionado ({birthdayCount} clientes)
            </span>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Dia Nasc.</th>
                  <th>Nome do Aniversariante</th>
                  <th>Data Nascimento</th>
                  <th>CPF</th>
                  <th>E-mail de Contato</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20 }}>Buscando aniversariantes...</td></tr>
                ) : birthdayCustomers.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Nenhum cliente faz aniversário no período filtrado.</td></tr>
                ) : (
                  birthdayCustomers.map(b => (
                    <tr key={b.id_cliente}>
                      <td>
                        <span className="kpi-badge up" style={{ fontSize: '0.85rem', padding: '4px 10px' }}>
                          🎂 {b.dia_aniversario}
                        </span>
                      </td>
                      <td><strong>{b.nome}</strong></td>
                      <td>{b.data_nasc}</td>
                      <td><code>{b.cpf || '-'}</code></td>
                      <td>{b.email || <span style={{ color: 'var(--text-dim)' }}>Não informado</span>}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Paginated Main Customer Table (10 items per page) with Search Input */}
      <div className="charts-grid">
        <div className="chart-card col-12">
          <div className="chart-header" style={{ flexWrap: 'wrap', gap: 12 }}>
            <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award color="var(--warning)" size={18} /> Cadastro e Ranking de Clientes
            </span>

            {/* Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '6px 12px', flex: '1 1 200px', maxWidth: '100%' }}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Buscar por nome, CPF, CNPJ ou e-mail..."
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
                  <th>ID</th>
                  <th>Cliente</th>
                  <th>Tipo Pessoa</th>
                  <th>CPF / CNPJ</th>
                  <th>Data Nasc.</th>
                  <th>Total Compras</th>
                  <th>Faturamento Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20 }}>Carregando clientes...</td></tr>
                ) : customers.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20 }}>Nenhum cliente encontrado.</td></tr>
                ) : (
                  customers.map(c => (
                    <tr key={c.id_cliente}>
                      <td><code>#{c.id_cliente}</code></td>
                      <td><strong>{c.nome}</strong></td>
                      <td>{c.pessoa === 'F' ? 'Física' : c.pessoa === 'J' ? 'Jurídica' : '-'}</td>
                      <td><code>{c.cpf || c.cnpj || '-'}</code></td>
                      <td>{c.data_nasc || '-'}</td>
                      <td>{c.total_compras} compras</td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                        {formatCurrency(c.faturamento_total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="pagination-container">
            <div>
              Exibindo página <strong>{page}</strong> de <strong>{totalPages}</strong> ({totalCustomers} clientes no total)
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
