import React, { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import axios from 'axios';
import type { FilterState, OverviewData } from '../types';
import { ShoppingBag, Clock, UserCheck, CreditCard } from 'lucide-react';

interface SalesPageProps {
  overviewData: OverviewData | null;
  filters: FilterState;
  theme: 'dark' | 'light';
}

export const SalesPage: React.FC<SalesPageProps> = ({ overviewData, filters, theme }) => {
  const [salesByHour, setSalesByHour] = useState<{ hora: string; vendas: number; faturamento: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.period) params.append('period', filters.period);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.lojaId) params.append('lojaId', filters.lojaId);

    axios.get(`http://localhost:3001/api/dashboard/sales?${params.toString()}`)
      .then(res => setSalesByHour(res.data.salesByHour || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
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

  const salesByHourOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
    theme: { mode: isDark ? 'dark' : 'light' },
    colors: ['#3b82f6'],
    plotOptions: { 
      bar: { 
        borderRadius: 4, 
        columnWidth: '45%',
        dataLabels: { position: 'top' }
      } 
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => formatCurrency(Number(val)),
      style: { colors: [dataLabelColor], fontSize: '11px', fontWeight: 600 },
      offsetY: -20,
    },
    xaxis: { categories: salesByHour.map(h => h.hora), labels: { style: { colors: textColor } } },
    yaxis: { labels: { formatter: (val) => formatCurrency(Number(val)), style: { colors: textColor } } },
    tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (val) => formatCurrency(Number(val)) } },
    grid: { borderColor: gridColor },
  };

  return (
    <div className="page-body">
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
        <div className="chart-card col-12">
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
              height={320}
            />
          )}
        </div>

        <div className="chart-card col-6">
          <div className="chart-header">
            <span className="chart-title">Desempenho por Vendedor</span>
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
                    <td>{v.vendas}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(v.faturamento)}</td>
                    <td>{formatCurrency(v.ticketMedio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="chart-card col-6">
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
