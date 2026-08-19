import React, { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import { api } from '../services/api';
import type { FilterState } from '../types';
import { 
  Package, 
  Layers, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  AlertCircle,
  CheckCircle2,
  Info,
  X,
  Calendar,
  Sparkles
} from 'lucide-react';

interface ProductsPageProps {
  filters: FilterState;
  theme?: 'dark' | 'light';
}

interface ProductItem {
  ref_id: string;
  produto: string;
  marca: string;
  estoque: number;
  custo_unitario: number;
  preco_venda: number;
  valor_parado: number;
  ultima_venda: string | null;
  dias_sem_venda: number;
  ultima_venda_formatada: string;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({ filters, theme = 'dark' }) => {
  const [data, setData] = useState<{
    kpis: {
      total_produtos: number;
      total_estoque: number;
      valor_estoque_custo: number;
      valor_estoque_venda: number;
      lucro_bruto_potencial: number;
      margem_potencial_pct: number;
    };
    agingDistribution: {
      ate30d: { label: string; valor: number; qtd: number; pct: number; color: string };
      de31a60d: { label: string; valor: number; qtd: number; pct: number; color: string };
      de61a90d: { label: string; valor: number; qtd: number; pct: number; color: string };
      mais90d: { label: string; valor: number; qtd: number; pct: number; color: string };
    };
    idleDaysThreshold: number;
    totalIdleCapital: number;
    top10Idle: ProductItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    products: ProductItem[];
  } | null>(null);

  const [idleDays, setIdleDays] = useState<number>(30);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);

  const fetchProducts = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', '10');
    params.append('idleDays', String(idleDays));
    if (filters.lojaId) params.append('lojaId', filters.lojaId);
    if (search.trim()) params.append('search', search.trim());

    api.get(`/api/dashboard/products?${params.toString()}`)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();

    const handleSync = () => fetchProducts();
    window.addEventListener('pbi_sync_completed', handleSync);
    return () => window.removeEventListener('pbi_sync_completed', handleSync);
  }, [filters, page, search, idleDays]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('pt-BR').format(val || 0);
  };

  const isDark = theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const dataLabelColor = isDark ? '#f8fafc' : '#0f172a';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';

  const kpis = data?.kpis || {
    total_produtos: 0,
    total_estoque: 0,
    valor_estoque_custo: 0,
    valor_estoque_venda: 0,
    lucro_bruto_potencial: 0,
    margem_potencial_pct: 0,
  };

  const aging = data?.agingDistribution;
  const top10 = data?.top10Idle || [];
  const products = data?.products || [];
  const totalPages = data?.totalPages || 1;

  // Gráfico de Faixas de Giro (Donut)
  const donutSeries = aging ? [
    aging.ate30d.valor,
    aging.de31a60d.valor,
    aging.de61a90d.valor,
    aging.mais90d.valor,
  ] : [0, 0, 0, 0];

  const donutLabels = [
    '🟢 Até 30 dias (Giro Saudável)',
    '🟡 31–60 dias',
    '🟠 61–90 dias',
    '🔴 +90 dias (Estagnado)',
  ];

  const donutColors = ['#10b981', '#eab308', '#f97316', '#ef4444'];

  const donutOptions: ApexCharts.ApexOptions = {
    chart: { type: 'donut', background: 'transparent' },
    theme: { mode: isDark ? 'dark' : 'light' },
    colors: donutColors,
    labels: donutLabels,
    legend: { position: 'bottom', labels: { colors: textColor } },
    dataLabels: {
      enabled: true,
      formatter: (val) => `${Number(val).toFixed(1)}%`,
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      y: { formatter: (val) => formatCurrency(Number(val)) },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Capital Total',
              color: textColor,
              formatter: () => formatCurrency(kpis.valor_estoque_custo),
            },
          },
        },
      },
    },
  };

  // Gráfico de Barras Horizontais: Estoque Parado Top 10
  const top10Categories = top10.map(p => {
    const nome = p.produto.length > 20 ? p.produto.substring(0, 20) + '...' : p.produto;
    return `${p.ref_id} - ${nome}`;
  });

  const barOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'bar',
      background: 'transparent',
      toolbar: { show: false },
      events: {
        dataPointSelection: (_event, _chartContext, config) => {
          const clickedIndex = config?.dataPointIndex;
          if (clickedIndex !== undefined && top10[clickedIndex]) {
            setSelectedProduct(top10[clickedIndex]);
          }
        },
      },
    },
    theme: { mode: isDark ? 'dark' : 'light' },
    colors: ['#ef4444'],
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 5,
        barHeight: '65%',
        dataLabels: { position: 'right' },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => formatCurrency(Number(val)),
      offsetX: 10,
      style: { colors: [dataLabelColor], fontSize: '11px', fontWeight: 600 },
    },
    xaxis: {
      categories: top10Categories,
      labels: {
        formatter: (val) => formatCurrency(Number(val)),
        style: { colors: textColor },
      },
    },
    yaxis: {
      labels: {
        style: { colors: textColor, fontSize: '11px' },
      },
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      y: {
        formatter: (val, opts) => {
          const item = opts?.dataPointIndex !== undefined ? top10[opts.dataPointIndex] : undefined;
          if (!item) return formatCurrency(Number(val));
          return `${formatCurrency(Number(val))} (${item.estoque} un • ${item.dias_sem_venda} dias sem venda)`;
        },
      },
    },
    grid: { borderColor: gridColor },
  };

  return (
    <div className="page-body">
      {/* 1. KPIs de Produtos & Estoque */}
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
            <span className="kpi-title">Capital investido</span>
            <div className="kpi-icon" style={{ color: 'var(--info)', backgroundColor: 'rgba(59, 130, 246, 0.15)' }}><DollarSign size={18} /></div>
          </div>
          <div className="kpi-value">{formatCurrency(kpis.valor_estoque_custo)}</div>
          <div className="kpi-badge neutral">Custo total em estoque</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Potencial de faturamento</span>
            <div className="kpi-icon" style={{ color: 'var(--success)', backgroundColor: 'var(--success-light)' }}><TrendingUp size={18} /></div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--success)' }}>{formatCurrency(kpis.valor_estoque_venda)}</div>
          <div className="kpi-badge neutral">Preço de venda total</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Lucro bruto potencial</span>
            <div className="kpi-icon" style={{ color: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.15)' }}><Sparkles size={18} /></div>
          </div>
          <div className="kpi-value" style={{ color: '#8b5cf6' }}>{formatCurrency(kpis.lucro_bruto_potencial)}</div>
          <div className="kpi-badge neutral" style={{ color: '#8b5cf6' }}>
            Margem: <strong>{kpis.margem_potencial_pct.toFixed(1)}%</strong>
          </div>
        </div>
      </div>

      {/* 2. Gráficos: Distribuição por Faixa de Giro + Estoque Parado Top 10 */}
      <div className="charts-grid">
        {/* Faixa de Giro */}
        <div className="chart-card col-6">
          <div className="chart-header">
            <div>
              <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={18} color="var(--primary)" /> Estoque por Idade da Última Venda
              </span>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Distribuição do capital investido por tempo de giro e envelhecimento
              </p>
            </div>
          </div>

          <div style={{ minHeight: 280 }}>
            {kpis.valor_estoque_custo === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                Nenhum dado de estoque disponível.
              </div>
            ) : (
              <Chart options={donutOptions} series={donutSeries} type="donut" height={280} />
            )}
          </div>

          {/* Faixa de Giro Mini Cards */}
          {aging && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginTop: 12 }}>
              <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Até 30 dias</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{formatCurrency(aging.ate30d.valor)}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{aging.ate30d.pct.toFixed(1)}% do capital</div>
              </div>

              <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                <div style={{ fontSize: '0.75rem', color: '#eab308', fontWeight: 600 }}>31 a 60 dias</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{formatCurrency(aging.de31a60d.valor)}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{aging.de31a60d.pct.toFixed(1)}% do capital</div>
              </div>

              <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.2)' }}>
                <div style={{ fontSize: '0.75rem', color: '#f97316', fontWeight: 600 }}>61 a 90 dias</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{formatCurrency(aging.de61a90d.valor)}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{aging.de61a90d.pct.toFixed(1)}% do capital</div>
              </div>

              <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>+90 dias (Parado)</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{formatCurrency(aging.mais90d.valor)}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{aging.mais90d.pct.toFixed(1)}% do capital</div>
              </div>
            </div>
          )}
        </div>

        {/* Estoque Parado Top 10 com Seletor */}
        <div className="chart-card col-6">
          <div className="chart-header" style={{ flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
            <div>
              <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={18} color="#ef4444" /> Estoque Parado — Top 10 Produtos
              </span>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Valor investido parado sem venda há mais de {idleDays} dias
              </p>
            </div>

            {/* Seletor de Período de Inatividade */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '4px 8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Estoque parado há:</span>
              <select
                value={idleDays}
                onChange={e => {
                  setIdleDays(Number(e.target.value));
                  setPage(1);
                }}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                <option value={30}>30 dias</option>
                <option value={60}>60 dias</option>
                <option value={90}>90 dias</option>
                <option value={180}>180 dias</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Capital total parado (+{idleDays} dias):
            </span>
            <strong style={{ color: '#ef4444', fontSize: '1rem' }}>
              {formatCurrency(data?.totalIdleCapital || 0)}
            </strong>
          </div>

          <div style={{ minHeight: 280 }}>
            {top10.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={32} color="var(--success)" style={{ marginBottom: 8 }} />
                <div>Nenhum produto parado acima de {idleDays} dias!</div>
              </div>
            ) : (
              <Chart options={barOptions} series={[{ name: 'Valor Parado (R$)', data: top10.map(p => p.valor_parado) }]} type="bar" height={280} />
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: 4 }}>
            * Clique em uma barra ou linha da tabela para ver a ficha detalhada do produto.
          </div>
        </div>
      </div>

      {/* 3. Tabela Detalhada de Produtos com Estoque Parado */}
      <div className="charts-grid">
        <div className="chart-card col-12">
          <div className="chart-header" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div>
              <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={18} color="var(--primary)" /> Lista Completa de Produtos com Estoque Parado (+{idleDays} dias)
              </span>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Clique em qualquer produto para visualizar a análise completa
              </p>
            </div>

            {/* Busca em tempo real */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '6px 12px', flex: '1 1 240px', maxWidth: 350 }}>
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
                  <th style={{ textAlign: 'right' }}>Estoque</th>
                  <th style={{ textAlign: 'right' }}>Custo Unit.</th>
                  <th style={{ textAlign: 'right' }}>Valor Parado</th>
                  <th style={{ textAlign: 'center' }}>Última Venda</th>
                  <th style={{ textAlign: 'center' }}>Inatividade</th>
                  <th style={{ textAlign: 'center' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 20 }}>Carregando produtos...</td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 20 }}>Nenhum produto encontrado com mais de {idleDays} dias sem venda.</td></tr>
                ) : (
                  products.map((p, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => setSelectedProduct(p)}
                      style={{ cursor: 'pointer' }}
                      title="Clique para ver os detalhes do produto"
                    >
                      <td><code>{p.ref_id}</code></td>
                      <td><strong>{p.produto}</strong></td>
                      <td>{p.marca || '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatNumber(p.estoque)} un</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(p.custo_unitario)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>
                        {formatCurrency(p.valor_parado)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {p.ultima_venda_formatada}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`kpi-badge ${p.dias_sem_venda > 90 ? 'down' : 'neutral'}`}>
                          {p.dias_sem_venda >= 999 ? 'Sem vendas' : `${p.dias_sem_venda} dias`}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn-period"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(p);
                          }}
                          style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                        >
                          <Info size={13} style={{ marginRight: 4 }} /> Ver Ficha
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Controles de Paginação */}
          <div className="pagination-container">
            <div>
              Exibindo página <strong>{page}</strong> de <strong>{totalPages}</strong> ({data?.total || 0} produtos parados no total)
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

      {/* 4. Modal de Detalhe do Produto */}
      {selectedProduct && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
          onClick={() => setSelectedProduct(null)}
        >
          <div 
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 12,
              padding: 24,
              maxWidth: 550,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <span className="kpi-badge neutral" style={{ marginBottom: 6 }}>Ficha do Produto</span>
                <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.2rem' }}>{selectedProduct.produto}</h3>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Referência: <code>{selectedProduct.ref_id}</code> • Marca: <strong>{selectedProduct.marca}</strong>
                </p>
              </div>
              <button 
                onClick={() => setSelectedProduct(null)}
                style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 12, borderRadius: 8, backgroundColor: 'var(--bg-card-hover)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estoque Físico</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>
                  {formatNumber(selectedProduct.estoque)} un
                </div>
              </div>

              <div style={{ padding: 12, borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>Valor Investido Parado</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ef4444', marginTop: 2 }}>
                  {formatCurrency(selectedProduct.valor_parado)}
                </div>
              </div>

              <div style={{ padding: 12, borderRadius: 8, backgroundColor: 'var(--bg-card-hover)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Custo Unitário</span>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginTop: 2 }}>
                  {formatCurrency(selectedProduct.custo_unitario)}
                </div>
              </div>

              <div style={{ padding: 12, borderRadius: 8, backgroundColor: 'var(--bg-card-hover)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Preço de Venda (Tabela)</span>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--success)', marginTop: 2 }}>
                  {formatCurrency(selectedProduct.preco_venda)}
                </div>
              </div>
            </div>

            <div style={{ padding: 12, borderRadius: 8, backgroundColor: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Calendar size={16} color="var(--primary)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Histórico de Vendas</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Última venda registrada: <strong>{selectedProduct.ultima_venda_formatada}</strong>
              </div>
              <div style={{ fontSize: '0.85rem', color: selectedProduct.dias_sem_venda > 90 ? '#ef4444' : 'var(--text-muted)', marginTop: 4 }}>
                Tempo sem movimentação: <strong>{selectedProduct.dias_sem_venda >= 999 ? 'Sem vendas registradas' : `${selectedProduct.dias_sem_venda} dias`}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="btn-period active" 
                onClick={() => setSelectedProduct(null)}
                style={{ padding: '8px 20px' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
