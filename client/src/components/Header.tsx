import React from 'react';
import { 
  Calendar, 
  Filter, 
  RefreshCw, 
  Sun, 
  Moon,
  Menu,
  HelpCircle
} from 'lucide-react';
import type { FilterState, FilterOptions } from '../types';

interface HeaderProps {
  activeTab: string;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  filterOptions: FilterOptions;
  storesStatus: any[];
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  onRefreshSync?: () => void;
  onToggleMobileMenu?: () => void;
  onOpenHelp?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  filters,
  setFilters,
  filterOptions,
  storesStatus,
  theme,
  toggleTheme,
  onRefreshSync,
  onToggleMobileMenu,
  onOpenHelp,
}) => {
  const titles: Record<string, { title: string; subtitle: string }> = {
    'visao-geral': { title: 'Visão Geral', subtitle: 'Acompanhamento consolidado dos principais KPIs e faturamento.' },
    'vendas': { title: 'Vendas', subtitle: 'Análise detalhada de desempenho comercial, vendedores e horários.' },
    'produtos': { title: 'Produtos / Estoque', subtitle: 'Gestão de estoque, giro de produtos, ruptura por cor e tamanho (10 itens por página).' },
    'clientes': { title: 'Clientes', subtitle: 'Comportamento de compra, novos clientes e ticket médio (10 clientes por página).' },
    'comparativo-lojas': { title: 'Comparativo de Lojas', subtitle: 'Ranking e matriz comparativa entre unidades da empresa.' },
    'arquivos-pbi': { title: 'Arquivos PBI & Importações', subtitle: 'Monitoramento de integridade e logs de carga do FTP.' },
    'empresas-lojas': { title: 'Lojas & Configurações', subtitle: 'Cadastro de unidades, CNPJs e configurações.' },
  };

  const currentInfo = titles[activeTab] || { title: 'Dashboard', subtitle: '' };
  const totalStores = storesStatus.length > 0 ? storesStatus.length : filterOptions.lojas.length;
  const updatedStores = storesStatus.filter(s => s.status === 'ATUALIZADA').length;
  const rawSync = storesStatus.find(s => s.data_processamento)?.data_processamento || storesStatus.find(s => s.data_pbi)?.data_pbi;
  const lastSyncTime = rawSync ? String(rawSync).substring(0, 16) : '';

  const handlePeriodChange = (periodKey: string) => {
    setFilters(prev => ({ ...prev, period: periodKey }));
  };

  const handleLojaChange = (newLojaId: string) => {
    setFilters(prev => {
      let newVendedorId = prev.vendedorId;
      if (newLojaId && prev.vendedorId) {
        const seller = filterOptions.vendedores.find(v => String(v.id) === String(prev.vendedorId));
        if (seller && String(seller.loja_id) !== String(newLojaId)) {
          newVendedorId = '';
        }
      }
      return { ...prev, lojaId: newLojaId, vendedorId: newVendedorId };
    });
  };

  const availableVendedores = filterOptions.vendedores.filter(v => {
    if (!filters.lojaId) return true;
    return String(v.loja_id) === String(filters.lojaId);
  });

  return (
    <header className="app-header">
      <div className="header-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onToggleMobileMenu && (
            <button className="mobile-menu-toggle" onClick={onToggleMobileMenu} title="Abrir Menu">
              <Menu size={20} />
            </button>
          )}
          <div className="page-title">
            <h2>{currentInfo.title}</h2>
            <p>{currentInfo.subtitle}</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {onOpenHelp && (
            <button 
              className="theme-toggle-btn" 
              onClick={onOpenHelp} 
              title="Abrir Manual do Usuário e Documentação (Atalho: F1)"
              style={{ color: '#f97316' }}
            >
              <HelpCircle size={14} color="#f97316" />
              <span>Ajuda <kbd style={{ fontSize: '0.65rem', background: 'rgba(249, 115, 22, 0.15)', padding: '1px 4px', borderRadius: '3px' }}>F1</kbd></span>
            </button>
          )}

          <button className="theme-toggle-btn" onClick={toggleTheme} title="Alternar entre Tema Claro e Escuro">
            {theme === 'dark' ? <Sun size={14} color="#f59e0b" /> : <Moon size={14} color="#6366f1" />}
            <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>

          <div className="sync-status-badge">
            <span className="status-dot" style={{ backgroundColor: totalStores > 0 ? (updatedStores === totalStores ? 'var(--success)' : '#f59e0b') : '#94a3b8' }} />
            <span>
              {totalStores === 0 ? (
                <strong style={{ color: 'var(--text-muted)' }}>Aguardando primeiro PBI</strong>
              ) : (
                <>
                  <strong>{updatedStores} de {totalStores} lojas atualizadas</strong>
                  {lastSyncTime && <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>({lastSyncTime})</span>}
                </>
              )}
            </span>
          </div>

          {onRefreshSync && (
            <button className="btn-period" onClick={onRefreshSync} title="Sincronizar FTP / PBI">
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 8 }}>
          <Filter size={16} color="var(--primary)" />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>FILTROS:</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: '1 1 auto', overflowX: 'auto' }}>
          <button
            className={`btn-period ${filters.period === 'today' ? 'active' : ''}`}
            onClick={() => handlePeriodChange('today')}
          >
            Hoje
          </button>
          <button
            className={`btn-period ${filters.period === '3days' ? 'active' : ''}`}
            onClick={() => handlePeriodChange('3days')}
          >
            Últimos 3 dias
          </button>
          <button
            className={`btn-period ${filters.period === '7days' ? 'active' : ''}`}
            onClick={() => handlePeriodChange('7days')}
          >
            Últimos 7 dias
          </button>
          <button
            className={`btn-period ${filters.period === 'thisMonth' ? 'active' : ''}`}
            onClick={() => handlePeriodChange('thisMonth')}
          >
            Este Mês
          </button>
          <button
            className={`btn-period ${filters.period === 'lastMonth' ? 'active' : ''}`}
            onClick={() => handlePeriodChange('lastMonth')}
          >
            Mês Anterior
          </button>
          <button
            className={`btn-period ${filters.period === 'custom' ? 'active' : ''}`}
            onClick={() => handlePeriodChange('custom')}
          >
            Personalizado
          </button>
        </div>

        {filters.period === 'custom' && (
          <div className="filter-group">
            <Calendar size={14} color="var(--text-muted)" />
            <input
              type="date"
              className="filter-input"
              value={filters.startDate}
              onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>até</span>
            <input
              type="date"
              className="filter-input"
              value={filters.endDate}
              onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
        )}

        <div style={{ height: 20, width: 1, backgroundColor: 'var(--border-color)', margin: '0 4px' }} />

        {/* Loja Dropdown */}
        <div className="filter-group">
          <span className="filter-label">Loja:</span>
          <select
            className="filter-select"
            value={filters.lojaId}
            onChange={e => handleLojaChange(e.target.value)}
          >
            <option value="">Todas as Lojas</option>
            {filterOptions.lojas.map(l => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </select>
        </div>

        {/* Vendedor Dropdown */}
        <div className="filter-group">
          <span className="filter-label">Vendedor:</span>
          <select
            className="filter-select"
            value={filters.vendedorId}
            onChange={e => setFilters(prev => ({ ...prev, vendedorId: e.target.value }))}
          >
            <option value="">
              {filters.lojaId ? 'Todos da Loja' : 'Todos os Vendedores'}
            </option>
            {availableVendedores.map(v => (
              <option key={v.id} value={v.id}>{v.nome}</option>
            ))}
          </select>
        </div>

        {/* Marca Dropdown */}
        <div className="filter-group">
          <span className="filter-label">Marca:</span>
          <select
            className="filter-select"
            value={filters.marcaId}
            onChange={e => setFilters(prev => ({ ...prev, marcaId: e.target.value }))}
          >
            <option value="">Todas</option>
            {filterOptions.marcas.map(m => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};
