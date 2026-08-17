export interface FilterState {
  period: string;
  startDate: string;
  endDate: string;
  lojaId: string;
  vendedorId: string;
  marcaId: string;
  grupoId: string;
  familiaId: string;
  colecaoId: string;
}

export interface FilterOptions {
  lojas: { id: number; nome: string; cnpj: string }[];
  vendedores: { id: number; nome: string; loja_id: number }[];
  marcas: { id: number; nome: string }[];
  grupos: { id: number; nome: string }[];
  familias: { id: number; nome: string }[];
  colecoes: { id: number; nome: string }[];
}

export interface OverviewData {
  period: { curStart: string; curEnd: string; prevStart: string; prevEnd: string };
  kpis: {
    faturamento: number;
    vendas: number;
    ticketMedio: number;
    itens: number;
    itensPorVenda: number;
    precoMedioItem: number;
    desconto: number;
    acrescimo: number;
    custoEstimado: number;
    margemEstimada: number;
    margemPct: number;
  };
  comparisons: {
    faturamento: number;
    vendas: number;
    ticketMedio: number;
    itens: number;
    margemEstimada: number;
  };
  charts: {
    salesByDay: { data: string; vendas: number; faturamento: number }[];
    salesByStore: { loja: string; cnpj: string; vendas: number; faturamento: number }[];
    paymentMethods: { forma: string; valor: number }[];
    topProducts: { ref_id: string; produto: string; marca: string; quantidade: number; faturamento: number }[];
    topSellers: { id_vendedor: number; vendedor: string; vendas: number; faturamento: number; ticketMedio: number }[];
  };
  storesStatus: {
    id: number;
    loja: string;
    cnpj: string;
    ultimo_pbi: string;
    data_pbi: string;
    hora_pbi: string;
    status: string;
    data_processamento: string;
  }[];
}
