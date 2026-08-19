import React, { useEffect, useState, useMemo } from 'react';
import { X, Download, Search, BookOpen, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../services/api';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');

  useEffect(() => {
    if (isOpen && !markdown) {
      setLoading(true);
      api.get('/api/admin/manual/markdown')
        .then(res => {
          if (res.data && res.data.content) {
            setMarkdown(res.data.content);
          }
        })
        .catch(err => {
          console.error('Erro ao carregar manual:', err);
          setMarkdown('# Erro\nNão foi possível carregar o manual do usuário.');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, markdown]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Extract chapters / sections from markdown for quick navigation
  const sections = useMemo(() => {
    if (!markdown) return [];
    const lines = markdown.split('\n');
    const list: { title: string; id: string; level: number }[] = [];
    
    for (const line of lines) {
      if (line.startsWith('## ')) {
        const title = line.replace('## ', '').trim();
        const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        list.push({ title, id, level: 2 });
      }
    }
    return list;
  }, [markdown]);

  // Filter content if search is active
  const filteredMarkdown = useMemo(() => {
    if (!searchQuery.trim()) return markdown;
    const q = searchQuery.toLowerCase();
    const lines = markdown.split('\n');
    const matchedBlocks: string[] = [];
    let currentBlock: string[] = [];
    let blockMatches = false;

    for (const line of lines) {
      if (line.startsWith('## ') || line.startsWith('# ')) {
        if (currentBlock.length > 0 && blockMatches) {
          matchedBlocks.push(currentBlock.join('\n'));
        }
        currentBlock = [line];
        blockMatches = line.toLowerCase().includes(q);
      } else {
        currentBlock.push(line);
        if (line.toLowerCase().includes(q)) {
          blockMatches = true;
        }
      }
    }
    if (currentBlock.length > 0 && blockMatches) {
      matchedBlocks.push(currentBlock.join('\n'));
    }

    return matchedBlocks.length > 0
      ? `# Resultados da busca por: "${searchQuery}"\n\n` + matchedBlocks.join('\n\n---\n\n')
      : `# Nenhum resultado encontrado para "${searchQuery}"\nTente buscar por termos como *faturamento*, *ticket*, *estoque*, *curva abc* ou *lojas*.`;
  }, [markdown, searchQuery]);

  const handleDownloadPdf = () => {
    window.open('/api/admin/manual/pdf', '_blank');
  };

  const scrollToSection = (title: string) => {
    setSelectedSection(title);
    const cleanTitle = title.replace(/^[0-9.]+\s*/, '').toLowerCase();
    const headings = document.querySelectorAll('.help-markdown-content h2, .help-markdown-content h1');
    for (const h of Array.from(headings)) {
      if (h.textContent?.toLowerCase().includes(cleanTitle)) {
        h.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay help-modal-overlay" onClick={onClose}>
      <div 
        className="modal-content help-modal-container" 
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '1200px',
          width: '95vw',
          height: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          borderRadius: '16px',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Header do Modal */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-card-hover)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <BookOpen size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Manual do Usuário — Amura Dashboard
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Documentação oficial, KPIs explicados e atalho de ajuda [F1]
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={handleDownloadPdf}
              className="btn-period"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(249, 115, 22, 0.12)',
                color: '#f97316',
                border: '1px solid rgba(249, 115, 22, 0.3)',
                padding: '6px 14px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              title="Baixar versão oficial em PDF com fotos do sistema"
            >
              <Download size={16} /> Baixar Manual em PDF
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Fechar (ESC)"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Corpo com Navegação Lateral e Conteúdo */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Menu Lateral de Capítulos */}
          <div 
            style={{
              width: '280px',
              borderRight: '1px solid var(--border-color)',
              background: 'var(--bg-main)',
              display: 'flex',
              flexDirection: 'column',
              padding: '16px',
              overflowY: 'auto',
            }}
          >
            {/* Campo de Busca */}
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Buscar no manual..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: 8,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              Capítulos do Manual
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {sections.map((sec, idx) => (
                <button
                  key={idx}
                  onClick={() => scrollToSection(sec.title)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: selectedSection === sec.title ? 'rgba(249, 115, 22, 0.15)' : 'transparent',
                    color: selectedSection === sec.title ? '#f97316' : 'var(--text-main)',
                    border: 'none',
                    fontSize: '0.82rem',
                    fontWeight: selectedSection === sec.title ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sec.title}
                  </span>
                  <ChevronRight size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
                </button>
              ))}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Atalho de Teclado: <strong>F1</strong>
              </div>
            </div>
          </div>

          {/* Área Principal de Leitura */}
          <div 
            style={{
              flex: 1,
              padding: '30px 40px',
              overflowY: 'auto',
              background: 'var(--bg-card)',
            }}
          >
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                Carregando manual do usuário...
              </div>
            ) : (
              <div className="help-markdown-content" style={{ maxWidth: '850px', margin: '0 auto', color: 'var(--text-main)', lineHeight: 1.7 }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {filteredMarkdown}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
