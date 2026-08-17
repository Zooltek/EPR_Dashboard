import React, { useRef } from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Users, 
  Store, 
  FileCheck, 
  Building2, 
  Upload 
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  companyLogo: string | null;
  setCompanyLogo: (logo: string | null) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab,
  companyLogo,
  setCompanyLogo
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setCompanyLogo(result);
        localStorage.setItem('epr_company_logo', result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="company-logo-container" style={{ position: 'relative', width: '100%' }}>
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', width: '100%' }} 
            onClick={() => fileInputRef.current?.click()} 
            title="Clique para alterar a logo da sua empresa"
          >
            {companyLogo ? (
              <img 
                src={companyLogo} 
                alt="Logo da Empresa" 
                style={{ 
                  maxHeight: 40, 
                  maxWidth: 50, 
                  objectFit: 'contain', 
                  borderRadius: 6,
                  backgroundColor: 'transparent'
                }} 
              />
            ) : (
              <img 
                src="/default_logo.png" 
                alt="Logo Padrão EPR" 
                style={{ 
                  maxHeight: 40, 
                  maxWidth: 45, 
                  objectFit: 'contain',
                  borderRadius: 6
                }} 
              />
            )}

            <div className="logo-text" style={{ flex: 1 }}>
              <h1 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, lineHeight: 1.2, color: 'var(--text-main)' }}>
                Dashboard Gerencial
              </h1>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>
                <Upload size={10} /> {companyLogo ? 'Alterar Logo' : 'Inserir Logo'}
              </span>
            </div>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleLogoUpload} 
            accept="image/*" 
            style={{ display: 'none' }} 
          />
        </div>
      </div>

      <nav className="sidebar-menu">
        <div className="menu-section-title">DASHBOARDS</div>
        
        <div 
          className={`menu-item ${activeTab === 'visao-geral' ? 'active' : ''}`}
          onClick={() => setActiveTab('visao-geral')}
        >
          <LayoutDashboard size={18} />
          <span>Visão Geral</span>
        </div>

        <div 
          className={`menu-item ${activeTab === 'vendas' ? 'active' : ''}`}
          onClick={() => setActiveTab('vendas')}
        >
          <ShoppingBag size={18} />
          <span>Vendas</span>
        </div>

        <div 
          className={`menu-item ${activeTab === 'produtos' ? 'active' : ''}`}
          onClick={() => setActiveTab('produtos')}
        >
          <Package size={18} />
          <span>Produtos / Estoque</span>
        </div>

        <div 
          className={`menu-item ${activeTab === 'clientes' ? 'active' : ''}`}
          onClick={() => setActiveTab('clientes')}
        >
          <Users size={18} />
          <span>Clientes</span>
        </div>

        <div 
          className={`menu-item ${activeTab === 'comparativo-lojas' ? 'active' : ''}`}
          onClick={() => setActiveTab('comparativo-lojas')}
        >
          <Store size={18} />
          <span>Comparativo de Lojas</span>
        </div>

        <div className="menu-section-title" style={{ marginTop: 16 }}>ADMINISTRAÇÃO</div>

        <div 
          className={`menu-item ${activeTab === 'arquivos-pbi' ? 'active' : ''}`}
          onClick={() => setActiveTab('arquivos-pbi')}
        >
          <FileCheck size={18} />
          <span>Arquivos PBI</span>
        </div>

        <div 
          className={`menu-item ${activeTab === 'empresas-lojas' ? 'active' : ''}`}
          onClick={() => setActiveTab('empresas-lojas')}
        >
          <Building2 size={18} />
          <span>Lojas & Configuração</span>
        </div>
      </nav>
    </aside>
  );
};
