import React, { useEffect, useState } from 'react';
import { api } from './services/api';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewPage } from './pages/OverviewPage';
import { SalesPage } from './pages/SalesPage';
import { ProductsPage } from './pages/ProductsPage';
import { CustomersPage } from './pages/CustomersPage';
import { StoreComparisonPage } from './pages/StoreComparisonPage';
import { PbiFilesPage } from './pages/PbiFilesPage';
import { EmpresasPage } from './pages/EmpresasPage';
import type { FilterState, FilterOptions, OverviewData } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('visao-geral');

  // Theme Mode (Dark / Light)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('epr_theme') as 'dark' | 'light') || 'dark';
  });

  // Company Custom Logo
  const [companyLogo, setCompanyLogo] = useState<string | null>(() => {
    return localStorage.getItem('epr_company_logo') || null;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('epr_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [filters, setFilters] = useState<FilterState>({
    period: 'thisMonth',
    startDate: '',
    endDate: '',
    lojaId: '',
    vendedorId: '',
    marcaId: '',
    grupoId: '',
    familiaId: '',
    colecaoId: '',
  });

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    lojas: [],
    vendedores: [],
    marcas: [],
    grupos: [],
    familias: [],
    colecoes: [],
  });

  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch Filter Dropdown Options
  useEffect(() => {
    api.get('/api/admin/filters')
      .then(res => setFilterOptions(res.data))
      .catch(err => console.error('Erro ao carregar opções de filtro:', err));
  }, []);

  // Fetch Overview Data on filter change
  const fetchOverview = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.period) params.append('period', filters.period);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.lojaId) params.append('lojaId', filters.lojaId);
    if (filters.vendedorId) params.append('vendedorId', filters.vendedorId);
    if (filters.marcaId) params.append('marcaId', filters.marcaId);
    if (filters.grupoId) params.append('grupoId', filters.grupoId);
    if (filters.familiaId) params.append('familiaId', filters.familiaId);
    if (filters.colecaoId) params.append('colecaoId', filters.colecaoId);

    api.get(`/api/dashboard/overview?${params.toString()}`)
      .then(res => setOverviewData(res.data))
      .catch(err => console.error('Erro ao carregar visão geral:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOverview();
  }, [filters]);

  const handleRefreshSync = () => {
    api.post('/api/admin/sync-pbi')
      .then(() => fetchOverview())
      .catch(err => console.error(err));
  };

  return (
    <div className="app-container">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        companyLogo={companyLogo}
        setCompanyLogo={setCompanyLogo}
      />
      
      <main className="main-content">
        <Header
          activeTab={activeTab}
          filters={filters}
          setFilters={setFilters}
          filterOptions={filterOptions}
          storesStatus={overviewData?.storesStatus || []}
          theme={theme}
          toggleTheme={toggleTheme}
          onRefreshSync={handleRefreshSync}
        />

        {activeTab === 'visao-geral' && (
          <OverviewPage data={overviewData} loading={loading} theme={theme} />
        )}
        {activeTab === 'vendas' && (
          <SalesPage overviewData={overviewData} filters={filters} theme={theme} />
        )}
        {activeTab === 'produtos' && (
          <ProductsPage filters={filters} />
        )}
        {activeTab === 'clientes' && (
          <CustomersPage overviewData={overviewData} filters={filters} />
        )}
        {activeTab === 'comparativo-lojas' && (
          <StoreComparisonPage filters={filters} />
        )}
        {activeTab === 'arquivos-pbi' && (
          <PbiFilesPage />
        )}
        {activeTab === 'empresas-lojas' && (
          <EmpresasPage />
        )}
      </main>
    </div>
  );
};

export default App;
