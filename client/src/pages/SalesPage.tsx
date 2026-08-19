import React, { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import { api } from '../services/api';
import type { FilterState, OverviewData } from '../types';
import { 
  ShoppingBag, 
  Clock, 
  UserCheck, 
  CreditCard, 
  DollarSign,
  BarChart3, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp
} from 'lucide-react';

interface SalesPageProps {
  overviewData: OverviewData | null;
  filters: FilterState;
  theme: 'dark' | 'light';
}

interface AbcItem {
  ref_id: string;
  produto: string;
  marca: string;
  faturamento: number;
  quantidade: number;
  classe: 'A' | 'B' | 'C';
  pctAcumulado: number;
}

interface AbcSummary {
  totalItens: number;
  totalFaturamento?: number;
  totalVolume?: number;
  classeA: { qtdProdutos: number; faturamento?: number; volume?: number; pctFaturamento?: number; pctVolume?: number };
  classeB: { qtdProdutos: number; faturamento?: number; volume?: number; pctFaturamento?: number; pctVolume?: number };
  classeC: { qtdProdutos: number; faturamento?: number; volume?: number; pctFaturamento?: number; pctVolume?: number };
}

export const SalesPage: React.FC<SalesPageProps> = ({ overviewData, filters, theme }) => {
  const [salesByHour, setSalesByHour] = useState<{ hora: string; vendas: number; faturamento: number }[]>([]);
  const [curvaAbcData, setCurvaAbcData] = useState<{
    porValor: { resumo: AbcSummary; items: AbcItem[] };
    porQuantidade: { resumo: AbcSummary; items: AbcItem[] };
  } | null>(null);

  const [abcMode, setAbcMode] = useState<'valor' | 'quantidade'>('valor');
  const [abcPage, setAbcPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchSales = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.period) params.append('period', filters.period);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.lojaId) params.append('lojaId', filters.lojaId);

    api.get(`/api/dashboard/sales?${params.toString()}`)
      .then(res => {
        setSalesByHour(res.data.salesByHour || []);
        if (res.data.curvaAbc) {
          setCurvaAbcData(res.data.curvaAbc);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSales();

    const handleSync = () => fetchSales();
    window.addEventListener('pbi_sync_completed', handleSync);
    return () => window.removeEventListener('pbi_sync_completed', handleSync);
  }, [filters]);

  if (!overviewData) return null;

  const { kpis, charts } = overviewData;

  const isDark = theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const dataLabelColor = isDark ? '#f8fafc' : '#0f172a';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';

  const formatCurrency = (val: number) => {
    const num = typeof val === 'number' ? val : Number(val) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('pt-BR').format(val || 0);
  };

  // Opções do Gráfico de Vendas por Horário (Compacto com ferramentas de zoom)
  const salesByHourOptions: ApexCharts.ApexOptions = {
    chart: { 
      type: 'bar', 
      toolbar: { 
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true,
        },
        autoSelected: 'zoom',
      },
      zoom: {
        enabled: true,
        type: 'x',
        autoScaleYaxis: true,
      },
      background: 'transparent' 
    },
    theme: { mode: isDark ? 'dark' : 'light' },
    colors: ['#3b82f6'],
    plotOptions: { 
      bar: { 
        borderRadius: 4, 
        columnWidth: salesByHour.length > 18 ? '75%' : '50%',
        dataLabels: { position: 'top' }
      } 
    },
    dataLabels: {
      enabled: salesByHour.length <= 15,
      formatter: (val) => formatCurrency(Number(val)),
      style: { colors: [dataLabelColor], fontSize: '10px', fontWeight: 600 },
      offsetY: -16,
    },
    xaxis: { 
      categories: salesByHour.map(h => h.hora), 
      labels: { 
        hideOverlappingLabels: true,
        style: { colors: textColor, fontSize: '11px' } 
      } 
    },
    yaxis: { 
      labels: { 
        formatter: (val) => formatCurrency(Number(val)), 
        style: { colors: textColor, fontSize: '10px' } 
      } 
    },
    tooltip: { 
      theme: isDark ? 'dark' : 'light', 
      y: { formatter: (val) => formatCurrency(Number(val)) } 
    },
    grid: { borderColor: gridColor },
  };

  // Dados da Curva ABC selecionada
  const activeAbc = abcMode === 'valor' ? curvaAbcData?.porValor : curvaAbcData?.porQuantidade;
  const abcItems = activeAbc?.items || [];
  const abcResumo = activeAbc?.resumo;

  // Gráfico da Curva ABC (Top 20 produtos no ranking)
  const top20Abc = abcItems.slice(0, 20);
  const abcCategories = top20Abc.map(i => {
    const nome = i.produto.length > 15 ? i.produto.substring(0, 15) + '...' : i.produto;
    return `${i.ref_id} - ${nome}`;
  });

  const abcColors = top20Abc.map(i => {
    if (i.classe === 'A') return '#10b981';
    if (i.classe === 'B') return '#eab308';
    return '#64748b';
  });

  const abcChartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'bar',
      background: 'transparent',
      toolbar: {
        show: true,
        tools: { download: true, zoom: true, zoomin: true, zoomout: true, reset: true },
      },
    },
    theme: { mode: isDark ? 'dark' : 'light' },
    colors: abcColors,
    plotOptions: {
      bar: {
        borderRadius: 4,
        distributed: true,
        columnWidth: '55%',
        dataLabels: { position: 'top' },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => abcMode === 'valor' ? formatCurrency(Number(val)) : `${Number(val)} un`,
      offsetY: -18,
      style: { colors: [dataLabelColor], fontSize: '10px', fontWeight: 600 },
    },
    legend: { show: false },
    xaxis: {
      categories: abcCategories,
      labels: {
        rotate: -45,
        rotateAlways: true,
        hideOverlappingLabels: true,
        style: { colors: textColor, fontSize: '10px' },
      },
    },
    yaxis: {
      labels: {
        formatter: (val) => abcMode === 'valor' ? formatCurrency(Number(val)) : `${Number(val)} un`,
        style: { colors: textColor, fontSize: '10px' },
      },
    },
    tooltip: {
      theme: isDark ? 'dark' : 'light',
      y: {
        formatter: (val, opts) => {
          const item = opts?.dataPointIndex !== undefined ? top20Abc[opts.dataPointIndex] : undefined;
          if (!item) return String(val);
          return `${abcMode === 'valor' ? formatCurrency(Number(val)) : `${Number(val)} un`} (Classe ${item.classe} • Acumulado: ${item.pctAcumulado.toFixed(1)}%)`;
        },
      },
    },
    grid: { borderColor: gridColor },
  };

  // Paginação da tabela ABC (10 itens)
  const abcLimit = 10;
  const abcTotalPages = Math.max(1, Math.ceil(abcItems.length / abcLimit));
  const paginatedAbc = abcItems.slice((abcPage - 1) * abcLimit, abcPage * abcLimit);

  return (
    <div className="page-body">
      {/* KPIs Gerais de Vendas */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Faturamento Líquido</span>
            <div className="kpi-icon"><ShoppingBag size={18} /></div>
          </div>
          <div className="kpi-value">{formatCurrency(kpis.faturamento)}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Quantidade de Vendas</span>
            <div className="kpi-icon"><ShoppingBag size={18} /></div>
          </div>
          <div className="kpi-value">{kpis.vendas}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Ticket Médio</span>
            <div className="kpi-icon"><CreditCard size={18} /></div>
          </div>
          <div className="kpi-value">{formatCurrency(kpis.ticketMedio)}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Itens Vendidos</span>
            <div className="kpi-icon"><UserCheck size={18} /></div>
          </div>
          <div className="kpi-value">{kpis.itens}</div>
        </div>
      </div>

      <div className="charts-grid">
        {/* Gráfico 1: Vendas por Horário do Dia (Otimizado e Compacto) */}
        <div className="chart-card col-6">
          <div className="chart-header">
            <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock color="var(--info)" size={18} /> Vendas por Horário do Dia
            </span>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Carregando dados por horário...</div>
          ) : (
            <Chart
              options={salesByHourOptions}
              series={[{ name: 'Faturamento', data: salesByHour.map(h => h.faturamento) }]}
              type="bar"
              height={260}
            />
          )}
        </div>

        {/* Gráfico 2: Desempenho por Vendedor */}
        <div className="chart-card col-6">
          <div className="chart-header">
            <span className="chart-title">Desempenho por Vendedor</span>
          </div>
          <div className="table-container" style={{ maxHeight: 260, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vendedor</th>
                  <th>Vendas</th>
                  <th>Faturamento</th>
                  <th>Ticket Médio</th>
                </tr>
              </thead>
              <tbody>
                {charts.topSellers.map(v => (
                  <tr key={v.id_vendedor}>
                    <td><strong>{v.vendedor}</strong></td>
                    <td>{v.vendas}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(v.faturamento)}</td>
                    <td>{formatCurrency(v.ticketMedio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráfico 3: Curva ABC de Produtos */}
        <div className="chart-card col-12">
          <div className="chart-header" style={{ flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <div>
              <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={18} color="var(--primary)" /> Análise de Curva ABC de Produtos
              </span>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Classificação <strong>A (20%)</strong>, <strong>B (30%)</strong> e <strong>C (50%)</strong> dos itens vendidos
              </p>
            </div>

            {/* Alternância entre Filtro por Valor ou Quantidade */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: 'var(--bg-card-hover)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 3 }}>
              <button
                className={`btn-period ${abcMode === 'valor' ? 'active' : ''}`}
                onClick={() => { setAbcMode('valor'); setAbcPage(1); }}
                style={{ padding: '5px 12px', fontSize: '0.8rem' }}
              >
                <DollarSign size={14} style={{ marginRight: 4 }} /> Filtro por Valor (R$)
              </button>
              <button
                className={`btn-period ${abcMode === 'quantidade' ? 'active' : ''}`}
                onClick={() => { setAbcMode('quantidade'); setAbcPage(1); }}
                style={{ padding: '5px 12px', fontSize: '0.8rem' }}
              >
                <BarChart3 size={14} style={{ marginRight: 4 }} /> Filtro por Quantidade (un)
              </button>
            </div>
          </div>

          {/* Cards de Resumo das Classes A, B e C */}
          {abcResumo && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
              {/* Classe A */}
              <div style={{ padding: 14, borderRadius: 10, backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>CLASSE A (20% dos itens)</span>
                  <span className="kpi-badge up" style={{ fontSize: '0.75rem' }}>Alta Relevância</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {abcMode === 'valor' 
                    ? formatCurrency(abcResumo.classeA.faturamento || 0)
                    : `${formatNumber(abcResumo.classeA.volume || 0)} un`}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {abcResumo.classeA.qtdProdutos} produtos ({abcMode === 'valor' ? abcResumo.classeA.pctFaturamento?.toFixed(1) : abcResumo.classeA.pctVolume?.toFixed(1)}% do total)
                </div>
              </div>

              {/* Classe B */}
              <div style={{ padding: 14, borderRadius: 10, backgroundColor: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#eab308' }}>CLASSE B (30% dos itens)</span>
                  <span className="kpi-badge neutral" style={{ fontSize: '0.75rem', color: '#eab308' }}>Média Relevância</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {abcMode === 'valor' 
                    ? formatCurrency(abcResumo.classeB.faturamento || 0)
                    : `${formatNumber(abcResumo.classeB.volume || 0)} un`}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {abcResumo.classeB.qtdProdutos} produtos ({abcMode === 'valor' ? abcResumo.classeB.pctFaturamento?.toFixed(1) : abcResumo.classeB.pctVolume?.toFixed(1)}% do total)
                </div>
              </div>

              {/* Classe C */}
              <div style={{ padding: 14, borderRadius: 10, backgroundColor: 'rgba(100, 116, 139, 0.1)', border: '1px solid rgba(100, 116, 139, 0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>CLASSE C (50% dos itens)</span>
                  <span className="kpi-badge neutral" style={{ fontSize: '0.75rem' }}>Cauda Longa</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {abcMode === 'valor' 
                    ? formatCurrency(abcResumo.classeC.faturamento || 0)
                    : `${formatNumber(abcResumo.classeC.volume || 0)} un`}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {abcResumo.classeC.qtdProdutos} produtos ({abcMode === 'valor' ? abcResumo.classeC.pctFaturamento?.toFixed(1) : abcResumo.classeC.pctVolume?.toFixed(1)}% do total)
                </div>
              </div>
            </div>
          )}

          {/* Gráfico Visual da Curva ABC */}
          <div style={{ minHeight: 300, marginBottom: 16 }}>
            {top20Abc.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                Nenhum produto vendido no período selecionado.
              </div>
            ) : (
              <Chart
                options={abcChartOptions}
                series={[{ 
                  name: abcMode === 'valor' ? 'Faturamento (R$)' : 'Quantidade Vendida',
                  data: top20Abc.map(i => abcMode === 'valor' ? i.faturamento : i.quantidade)
                }]}
                type="bar"
                height={300}
              />
            )}
          </div>

          {/* Tabela Paginada da Curva ABC */}
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Classe</th>
                  <th>Ref ID</th>
                  <th>Produto</th>
                  <th>Marca</th>
                  <th style={{ textAlign: 'right' }}>Faturamento</th>
                  <th style={{ textAlign: 'right' }}>Quantidade</th>
                  <th style={{ textAlign: 'right' }}>% Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAbc.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20 }}>Nenhum produto listado.</td></tr>
                ) : (
                  paginatedAbc.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <span 
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            backgroundColor: item.classe === 'A' ? 'rgba(16, 185, 129, 0.15)' : (item.classe === 'B' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(100, 116, 139, 0.15)'),
                            color: item.classe === 'A' ? '#10b981' : (item.classe === 'B' ? '#eab308' : 'var(--text-muted)'),
                            border: `1px solid ${item.classe === 'A' ? 'rgba(16, 185, 129, 0.3)' : (item.classe === 'B' ? 'rgba(234, 179, 8, 0.3)' : 'rgba(100, 116, 139, 0.3)')}`,
                          }}
                        >
                          Classe {item.classe}
                        </span>
                      </td>
                      <td><code>{item.ref_id}</code></td>
                      <td><strong>{item.produto}</strong></td>
                      <td>{item.marca}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                        {formatCurrency(item.faturamento)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatNumber(item.quantidade)} un
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {item.pctAcumulado.toFixed(1)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação da Curva ABC */}
          <div className="pagination-container">
            <div>
              Exibindo página <strong>{abcPage}</strong> de <strong>{abcTotalPages}</strong> ({abcItems.length} produtos classificados)
            </div>
            <div className="pagination-controls">
              <button 
                className="btn-page" 
                onClick={() => setAbcPage(p => Math.max(1, p - 1))}
                disabled={abcPage === 1}
              >
                <ChevronLeft size={16} /> Anterior
              </button>
              
              <span className="page-number active">{abcPage}</span>

              <button 
                className="btn-page" 
                onClick={() => setAbcPage(p => Math.min(abcTotalPages, p + 1))}
                disabled={abcPage >= abcTotalPages}
              >
                Próximo <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Gráfico 4: Formas de Pagamento */}
        <div className="chart-card col-12">
          <div className="chart-header">
            <span className="chart-title">Formas de Pagamento</span>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Forma de Pagamento</th>
                  <th>Valor Total</th>
                  <th>Participação</th>
                </tr>
              </thead>
              <tbody>
                {charts.paymentMethods.map(p => {
                  const total = charts.paymentMethods.reduce((a, b) => a + b.valor, 0);
                  const pct = total > 0 ? (p.valor / total) * 100 : 0;
                  return (
                    <tr key={p.forma}>
                      <td><strong>{p.forma}</strong></td>
                      <td style={{ fontWeight: 700 }}>{formatCurrency(p.valor)}</td>
                      <td>
                        <span className="kpi-badge neutral">{pct.toFixed(1)}%</span>
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
