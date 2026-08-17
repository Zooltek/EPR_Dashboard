import React from 'react';
import Chart from 'react-apexcharts';
import type { OverviewData } from '../types';
import { 
  DollarSign, 
  ShoppingCart, 
  Receipt, 
  Package, 
  Layers, 
  Tag, 
  TrendingUp, 
  Percent, 
  ArrowUpRight, 
  ArrowDownRight, 
  Award 
} from 'lucide-react';

interface OverviewPageProps {
  data: OverviewData | null;
  loading: boolean;
  theme: 'dark' | 'light';
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ data, loading, theme }) => {
  if (loading || !data) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>Carregando indicadores do Dashboard...</p>
      </div>
    );
  }

  const { kpis, comparisons, charts } = data;

  const isDark = theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#334155';
  const dataLabelColor = isDark ? '#f8fafc' : '#0f172a';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';

  const formatCurrency = (val: number) => {
    const num = typeof val === 'number' ? val : Number(val) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  const formatNumber = (val: number, decimals = 0) => {
    const num = typeof val === 'number' ? val : Number(val) || 0;
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num);
  };

  const renderBadge = (pct: number) => {
    const isUp = pct >= 0;
    return (
      <div className={`kpi-badge ${isUp ? 'up' : 'down'}`}>
        {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        <span>{Math.abs(pct).toFixed(1)}% vs anterior</span>
      </div>
    );
  };

  const salesByDayOptions: ApexCharts.ApexOptions = {
    chart: { type: 'area', toolbar: { show: false }, background: 'transparent' },
    theme: { mode: isDark ? 'dark' : 'light' },
    colors: ['#6366f1'],
    stroke: { curve: 'smooth', width: 3 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
    dataLabels: { enabled: false },
    xaxis: { categories: charts.salesByDay.map(d => d.data.substring(5)), labels: { style: { colors: textColor } } },
    yaxis: { labels: { formatter: (val) => formatCurrency(Number(val)), style: { colors: textColor } } },
    tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (val) => formatCurrency(Number(val)) } },
    grid: { borderColor: gridColor },
  };

  const salesCountOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
    theme: { mode: isDark ? 'dark' : 'light' },
    colors: ['#10b981'],
    plotOptions: { 
      bar: { 
        borderRadius: 4, 
        columnWidth: '50%',
        dataLabels: { position: 'top' }
      } 
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => `${formatNumber(Number(val))} un`,
      style: { colors: [dataLabelColor], fontSize: '11px', fontWeight: 600 },
      offsetY: -20,
    },
    xaxis: { categories: charts.salesByDay.map(d => d.data.substring(5)), labels: { style: { colors: textColor } } },
    yaxis: { labels: { formatter: (val) => formatNumber(Number(val)), style: { colors: textColor } } },
    tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (val) => `${formatNumber(Number(val))} vendas` } },
    grid: { borderColor: gridColor },
  };

  const salesByStoreOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
    theme: { mode: isDark ? 'dark' : 'light' },
    colors: ['#6366f1'],
    plotOptions: { 
      bar: { 
        horizontal: true, 
        borderRadius: 4,
        dataLabels: { position: 'top' }
      } 
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => formatCurrency(Number(val)),
      style: { colors: [dataLabelColor], fontSize: '11px', fontWeight: 700 }
    },
    xaxis: { categories: charts.salesByStore.map(s => s.loja), labels: { formatter: (val) => formatCurrency(Number(val)), style: { colors: textColor } } },
    yaxis: { labels: { style: { colors: textColor, fontWeight: 600 } } },
    tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (val) => formatCurrency(Number(val)) } },
    grid: { borderColor: gridColor },
  };

  const paymentDonutOptions: ApexCharts.ApexOptions = {
    chart: { type: 'donut', background: 'transparent' },
    theme: { mode: isDark ? 'dark' : 'light' },
    labels: charts.paymentMethods.map(p => p.forma),
    colors: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
    legend: { position: 'bottom', labels: { colors: textColor } },
    dataLabels: { enabled: true, formatter: (val) => `${Number(val).toFixed(1)}%` },
    tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (val) => formatCurrency(Number(val)) } },
  };

  return (
    <div className="page-body">
      {/* 10 KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Faturamento Líquido</span>
            <div className="kpi-icon"><DollarSign size={18} /></div>
          </div>
          <div className="kpi-value">{formatCurrency(kpis.faturamento)}</div>
          {renderBadge(comparisons.faturamento)}
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Vendas Válidas</span>
            <div className="kpi-icon"><ShoppingCart size={18} /></div>
          </div>
          <div className="kpi-value">{formatNumber(kpis.vendas)}</div>
          {renderBadge(comparisons.vendas)}
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Ticket Médio</span>
            <div className="kpi-icon"><Receipt size={18} /></div>
          </div>
          <div className="kpi-value">{formatCurrency(kpis.ticketMedio)}</div>
          {renderBadge(comparisons.ticketMedio)}
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Itens Vendidos</span>
            <div className="kpi-icon"><Package size={18} /></div>
          </div>
          <div className="kpi-value">{formatNumber(kpis.itens)}</div>
          {renderBadge(comparisons.itens)}
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Itens por Venda</span>
            <div className="kpi-icon"><Layers size={18} /></div>
          </div>
          <div className="kpi-value">{formatNumber(kpis.itensPorVenda, 2)}</div>
          <div className="kpi-badge neutral">Média de peças</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Preço Médio / Item</span>
            <div className="kpi-icon"><Tag size={18} /></div>
          </div>
          <div className="kpi-value">{formatCurrency(kpis.precoMedioItem)}</div>
          <div className="kpi-badge neutral">Preço médio líquido</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Desconto Total</span>
            <div className="kpi-icon" style={{ color: 'var(--warning)', backgroundColor: 'var(--warning-light)' }}><Tag size={18} /></div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--warning)' }}>{formatCurrency(kpis.desconto)}</div>
          <div className="kpi-badge neutral">Concedido no caixa</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Acréscimo Total</span>
            <div className="kpi-icon"><DollarSign size={18} /></div>
          </div>
          <div className="kpi-value">{formatCurrency(kpis.acrescimo)}</div>
          <div className="kpi-badge neutral">Taxas/Acréscimos</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Margem Estimada</span>
            <div className="kpi-icon" style={{ color: 'var(--success)', backgroundColor: 'var(--success-light)' }}><TrendingUp size={18} /></div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--success)' }}>{formatCurrency(kpis.margemEstimada)}</div>
          {renderBadge(comparisons.margemEstimada)}
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Margem %</span>
            <div className="kpi-icon" style={{ color: 'var(--success)', backgroundColor: 'var(--success-light)' }}><Percent size={18} /></div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--success)' }}>{kpis.margemPct.toFixed(1)}%</div>
          <div className="kpi-badge neutral">Sobre faturamento</div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="charts-grid">
        <div className="chart-card col-8">
          <div className="chart-header">
            <span className="chart-title">Faturamento por Dia</span>
          </div>
          <Chart
            options={salesByDayOptions}
            series={[{ name: 'Faturamento', data: charts.salesByDay.map(d => d.faturamento) }]}
            type="area"
            height={280}
          />
        </div>

        <div className="chart-card col-4">
          <div className="chart-header">
            <span className="chart-title">Formas de Pagamento</span>
          </div>
          {charts.paymentMethods.length > 0 ? (
            <Chart
              options={paymentDonutOptions}
              series={charts.paymentMethods.map(p => p.valor)}
              type="donut"
              height={280}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Sem dados</div>
          )}
        </div>

        <div className="chart-card col-6">
          <div className="chart-header">
            <span className="chart-title">Vendas Válidas por Dia</span>
          </div>
          <Chart
            options={salesCountOptions}
            series={[{ name: 'Qtd Vendas', data: charts.salesByDay.map(d => d.vendas) }]}
            type="bar"
            height={280}
          />
        </div>

        <div className="chart-card col-6">
          <div className="chart-header">
            <span className="chart-title">Faturamento por Loja</span>
          </div>
          <Chart
            options={salesByStoreOptions}
            series={[{ name: 'Faturamento', data: charts.salesByStore.map(s => s.faturamento) }]}
            type="bar"
            height={280}
          />
        </div>
      </div>

      {/* Ranking Tables */}
      <div className="charts-grid">
        <div className="chart-card col-6">
          <div className="chart-header">
            <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award color="var(--warning)" size={18} /> Top 10 Produtos Mais Vendidos
            </span>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ref ID</th>
                  <th>Produto</th>
                  <th>Marca</th>
                  <th>Qtd</th>
                  <th>Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {charts.topProducts.map(p => (
                  <tr key={p.ref_id}>
                    <td><code>{p.ref_id}</code></td>
                    <td><strong>{p.produto}</strong></td>
                    <td>{p.marca || '-'}</td>
                    <td>{formatNumber(p.quantidade)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(p.faturamento)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="chart-card col-6">
          <div className="chart-header">
            <span className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award color="var(--primary)" size={18} /> Top Vendedores
            </span>
          </div>
          <div className="table-container">
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
                    <td>{formatNumber(v.vendas)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(v.faturamento)}</td>
                    <td>{formatCurrency(v.ticketMedio)}</td>
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
