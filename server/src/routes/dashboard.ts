import { Router, Request, Response } from 'express';
import { db } from '../db/database';

export const dashboardRouter = Router();

// Helper to resolve date ranges
function resolveDateRange(period?: string, startDate?: string, endDate?: string) {
  const today = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  let curStart = '';
  let curEnd = formatDate(today);

  if (period === 'today') {
    curStart = curEnd;
  } else if (period === '3days') {
    const d = new Date(today);
    d.setDate(d.getDate() - 2);
    curStart = formatDate(d);
  } else if (period === '7days') {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    curStart = formatDate(d);
  } else if (period === 'lastMonth') {
    const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    curStart = formatDate(firstDayLastMonth);
    curEnd = formatDate(lastDayLastMonth);
  } else if (period === 'custom' && startDate && endDate) {
    curStart = startDate;
    curEnd = endDate;
  } else {
    // Default: 'thisMonth'
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    curStart = formatDate(firstDay);
  }

  // Calculate previous period of equal duration for comparison
  const curStartDate = new Date(curStart);
  const curEndDate = new Date(curEnd);
  const diffDays = Math.max(1, Math.round((curEndDate.getTime() - curStartDate.getTime()) / (86400 * 1000)) + 1);

  const prevEndDate = new Date(curStartDate);
  prevEndDate.setDate(prevEndDate.getDate() - 1);
  const prevStartDate = new Date(prevEndDate);
  prevStartDate.setDate(prevStartDate.getDate() - diffDays + 1);

  const prevStart = formatDate(prevStartDate);
  const prevEnd = formatDate(prevEndDate);

  return { curStart, curEnd, prevStart, prevEnd };
}

// Build WHERE SQL clauses for filter query params
function buildFilterClause(req: Request, cabAlias = 'vc', itemAlias = 'vi', prodAlias = 'p') {
  const { lojaId, vendedorId, marcaId, grupoId, familiaId, colecaoId } = req.query;

  const conditions: string[] = [];
  const params: any[] = [];

  if (lojaId) {
    conditions.push(`${cabAlias}.loja_id = ?`);
    params.push(Number(lojaId));
  }
  if (vendedorId) {
    conditions.push(`${cabAlias}.vendedor_id = ?`);
    params.push(Number(vendedorId));
  }
  if (marcaId) {
    conditions.push(`${prodAlias}.marca_id = ?`);
    params.push(Number(marcaId));
  }
  if (grupoId) {
    conditions.push(`${prodAlias}.grupo_id = ?`);
    params.push(Number(grupoId));
  }
  if (familiaId) {
    conditions.push(`${prodAlias}.familia_id = ?`);
    params.push(Number(familiaId));
  }
  if (colecaoId) {
    conditions.push(`${prodAlias}.colecao_id = ?`);
    params.push(Number(colecaoId));
  }

  const whereSql = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
  return { whereSql, params };
}

// 1. VISÃO GERAL API
dashboardRouter.get('/overview', (req: Request, res: Response) => {
  const { period, startDate, endDate } = req.query;
  const { curStart, curEnd, prevStart, prevEnd } = resolveDateRange(period as string, startDate as string, endDate as string);
  const filter = buildFilterClause(req, 'vc', 'vi', 'p');

  // Compute Current Period KPIs
  const kpisSql = `
    SELECT
      COALESCE(SUM(CASE WHEN vc.cancelada = 0 AND vi.cancelado = 0 AND vi.entrada = 0 THEN vi.total_liq ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN vc.cancelada = 0 AND vi.cancelado = 0 AND vi.entrada = 1 THEN vi.total_liq ELSE 0 END), 0) as faturamento,
      
      COUNT(DISTINCT CASE WHEN vc.cancelada = 0 THEN vc.loja_id || '-' || vc.d_venda || '-' || vc.c_venda END) as vendas,
      
      COALESCE(SUM(CASE WHEN vc.cancelada = 0 AND vi.cancelado = 0 AND vi.entrada = 0 THEN vi.qtd ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN vc.cancelada = 0 AND vi.cancelado = 0 AND vi.entrada = 1 THEN vi.qtd ELSE 0 END), 0) as itens,
      
      COALESCE(SUM(CASE WHEN vc.cancelada = 0 AND vi.cancelado = 0 AND vi.entrada = 0 THEN vi.total_bruto - vi.total_liq ELSE 0 END), 0) as desconto,
      
      COALESCE(SUM(CASE WHEN vc.cancelada = 0 THEN vc.v_acrescimo ELSE 0 END), 0) as acrescimo,
      
      COALESCE(SUM(CASE WHEN vc.cancelada = 0 AND vi.cancelado = 0 AND vi.entrada = 0 THEN vi.qtd * p.preco_custo ELSE 0 END), 0) as custo_total
    FROM venda_cab vc
    LEFT JOIN venda_item vi ON vc.loja_id = vi.loja_id AND vc.d_venda = vi.d_venda AND vc.c_venda = vi.c_venda
    LEFT JOIN produto p ON vi.ref_id = p.ref_id
    WHERE vc.d_venda BETWEEN ? AND ? ${filter.whereSql}
  `;

  const curRaw = db.prepare(kpisSql).get(curStart, curEnd, ...filter.params) as any;
  const prevRaw = db.prepare(kpisSql).get(prevStart, prevEnd, ...filter.params) as any;

  const calculateDerived = (raw: any) => {
    const faturamento = raw.faturamento || 0;
    const vendas = raw.vendas || 0;
    const itens = raw.itens || 0;
    const desconto = raw.desconto || 0;
    const acrescimo = raw.acrescimo || 0;
    const custo = raw.custo_total || 0;

    const ticketMedio = vendas > 0 ? faturamento / vendas : 0;
    const itensPorVenda = vendas > 0 ? itens / vendas : 0;
    const precoMedioItem = itens > 0 ? faturamento / itens : 0;
    const margemEstimada = faturamento - custo;
    const margemPct = faturamento > 0 ? (margemEstimada / faturamento) * 100 : 0;

    return {
      faturamento,
      vendas,
      ticketMedio,
      itens,
      itensPorVenda,
      precoMedioItem,
      desconto,
      acrescimo,
      margemEstimada,
      margemPct,
    };
  };

  const curKpis = calculateDerived(curRaw);
  const prevKpis = calculateDerived(prevRaw);

  const getPctDiff = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  const comparisons = {
    faturamento: getPctDiff(curKpis.faturamento, prevKpis.faturamento),
    vendas: getPctDiff(curKpis.vendas, prevKpis.vendas),
    ticketMedio: getPctDiff(curKpis.ticketMedio, prevKpis.ticketMedio),
    itens: getPctDiff(curKpis.itens, prevKpis.itens),
    margemEstimada: getPctDiff(curKpis.margemEstimada, prevKpis.margemEstimada),
  };

  // Sales by Day Chart
  const salesByDaySql = `
    SELECT 
      vc.d_venda as data,
      COUNT(DISTINCT CASE WHEN vc.cancelada = 0 THEN vc.loja_id || '-' || vc.d_venda || '-' || vc.c_venda END) as vendas,
      COALESCE(SUM(CASE WHEN vc.cancelada = 0 AND vi.cancelado = 0 AND vi.entrada = 0 THEN vi.total_liq ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN vc.cancelada = 0 AND vi.cancelado = 0 AND vi.entrada = 1 THEN vi.total_liq ELSE 0 END), 0) as faturamento
    FROM venda_cab vc
    LEFT JOIN venda_item vi ON vc.loja_id = vi.loja_id AND vc.d_venda = vi.d_venda AND vc.c_venda = vi.c_venda
    LEFT JOIN produto p ON vi.ref_id = p.ref_id
    WHERE vc.d_venda BETWEEN ? AND ? ${filter.whereSql}
    GROUP BY vc.d_venda
    ORDER BY vc.d_venda ASC
  `;
  const salesByDay = db.prepare(salesByDaySql).all(curStart, curEnd, ...filter.params);

  // Sales by Store Chart
  const salesByStoreSql = `
    SELECT 
      l.nome as loja,
      COALESCE(SUM(CASE WHEN vc.cancelada = 0 AND vi.cancelado = 0 AND vi.entrada = 0 THEN vi.total_liq ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN vc.cancelada = 0 AND vi.cancelado = 0 AND vi.entrada = 1 THEN vi.total_liq ELSE 0 END), 0) as faturamento
    FROM loja l
    LEFT JOIN venda_cab vc ON l.id = vc.loja_id AND vc.d_venda BETWEEN ? AND ?
    LEFT JOIN venda_item vi ON vc.loja_id = vi.loja_id AND vc.d_venda = vi.d_venda AND vc.c_venda = vi.c_venda
    LEFT JOIN produto p ON vi.ref_id = p.ref_id
    GROUP BY l.id
    ORDER BY faturamento DESC
  `;
  const salesByStore = db.prepare(salesByStoreSql).all(curStart, curEnd);

  // Payment Methods Donut
  const paymentDonutSql = `
    SELECT forma, SUM(valor) as valor FROM (
      SELECT t_pag1 as forma, SUM(v_pag1) as valor FROM venda_cab vc WHERE d_venda BETWEEN ? AND ? AND cancelada = 0 ${filter.whereSql} AND t_pag1 IS NOT NULL AND t_pag1 != '' GROUP BY t_pag1
      UNION ALL
      SELECT t_pag2 as forma, SUM(v_pag2) as valor FROM venda_cab vc WHERE d_venda BETWEEN ? AND ? AND cancelada = 0 ${filter.whereSql} AND t_pag2 IS NOT NULL AND t_pag2 != '' GROUP BY t_pag2
      UNION ALL
      SELECT t_pag3 as forma, SUM(v_pag3) as valor FROM venda_cab vc WHERE d_venda BETWEEN ? AND ? AND cancelada = 0 ${filter.whereSql} AND t_pag3 IS NOT NULL AND t_pag3 != '' GROUP BY t_pag3
      UNION ALL
      SELECT t_pag4 as forma, SUM(v_pag4) as valor FROM venda_cab vc WHERE d_venda BETWEEN ? AND ? AND cancelada = 0 ${filter.whereSql} AND t_pag4 IS NOT NULL AND t_pag4 != '' GROUP BY t_pag4
    ) GROUP BY forma HAVING valor > 0 ORDER BY valor DESC
  `;
  const paymentMethods = db.prepare(paymentDonutSql).all(
    curStart, curEnd, ...filter.params,
    curStart, curEnd, ...filter.params,
    curStart, curEnd, ...filter.params,
    curStart, curEnd, ...filter.params
  );

  // Top 10 Products
  const topProductsSql = `
    SELECT 
      p.ref_id,
      p.nome as produto,
      m.nome as marca,
      SUM(CASE WHEN vi.entrada = 0 THEN vi.qtd ELSE -vi.qtd END) as quantidade,
      SUM(CASE WHEN vi.entrada = 0 THEN vi.total_liq ELSE -vi.total_liq END) as faturamento
    FROM venda_item vi
    JOIN venda_cab vc ON vi.loja_id = vc.loja_id AND vi.d_venda = vc.d_venda AND vi.c_venda = vc.c_venda
    JOIN produto p ON vi.ref_id = p.ref_id
    LEFT JOIN marca m ON p.marca_id = m.id
    WHERE vc.d_venda BETWEEN ? AND ? AND vc.cancelada = 0 AND vi.cancelado = 0 ${filter.whereSql}
    GROUP BY p.ref_id
    ORDER BY faturamento DESC
    LIMIT 10
  `;
  const topProducts = db.prepare(topProductsSql).all(curStart, curEnd, ...filter.params);

  // Top 10 Sellers
  const topSellersSql = `
    SELECT 
      v.id_vendedor,
      COALESCE(v.nome, 'Vendedor ' || vc.vendedor_id) as vendedor,
      COUNT(DISTINCT vc.loja_id || '-' || vc.d_venda || '-' || vc.c_venda) as vendas,
      COALESCE(SUM(CASE WHEN vc.cancelada = 0 AND vi.cancelado = 0 AND vi.entrada = 0 THEN vi.total_liq ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN vc.cancelada = 0 AND vi.cancelado = 0 AND vi.entrada = 1 THEN vi.total_liq ELSE 0 END), 0) as faturamento
    FROM venda_cab vc
    LEFT JOIN vendedor v ON vc.vendedor_id = v.id_vendedor AND vc.loja_id = v.loja_id
    LEFT JOIN venda_item vi ON vc.loja_id = vi.loja_id AND vc.d_venda = vi.d_venda AND vc.c_venda = vi.c_venda
    LEFT JOIN produto p ON vi.ref_id = p.ref_id
    WHERE vc.d_venda BETWEEN ? AND ? ${filter.whereSql}
    GROUP BY vc.vendedor_id
    ORDER BY faturamento DESC
    LIMIT 10
  `;
  const topSellers = db.prepare(topSellersSql).all(curStart, curEnd, ...filter.params).map((s: any) => ({
    ...s,
    ticketMedio: s.vendas > 0 ? s.faturamento / s.vendas : 0,
  }));

  const storesStatusSql = `
    SELECT 
      l.id, l.nome as loja, l.cnpj,
      p.nome_arquivo as ultimo_pbi,
      p.data_pbi, p.hora_pbi, p.status, p.data_processamento
    FROM loja l
    LEFT JOIN pbi_arquivo p ON l.cnpj = p.cnpj_loja AND p.id = (
      SELECT id FROM pbi_arquivo WHERE cnpj_loja = l.cnpj ORDER BY id DESC LIMIT 1
    )
  `;
  const storesStatus = db.prepare(storesStatusSql).all();

  res.json({
    period: { curStart, curEnd, prevStart, prevEnd },
    kpis: curKpis,
    prevKpis,
    comparisons,
    charts: {
      salesByDay,
      salesByStore,
      paymentMethods,
      topProducts,
      topSellers,
    },
    storesStatus,
  });
});

// 2. VENDAS API
dashboardRouter.get('/sales', (req: Request, res: Response) => {
  const { period, startDate, endDate } = req.query;
  const { curStart, curEnd } = resolveDateRange(period as string, startDate as string, endDate as string);
  const filter = buildFilterClause(req, 'vc', 'vi', 'p');

  const salesByHourSql = `
    SELECT 
      SUBSTR(vc.h_venda, 1, 2) || ':00' as hora,
      COUNT(DISTINCT vc.loja_id || '-' || vc.d_venda || '-' || vc.c_venda) as vendas,
      SUM(CASE WHEN vi.entrada = 0 THEN vi.total_liq ELSE -vi.total_liq END) as faturamento
    FROM venda_cab vc
    LEFT JOIN venda_item vi ON vc.loja_id = vi.loja_id AND vc.d_venda = vi.d_venda AND vc.c_venda = vi.c_venda
    LEFT JOIN produto p ON vi.ref_id = p.ref_id
    WHERE vc.d_venda BETWEEN ? AND ? AND vc.cancelada = 0 ${filter.whereSql}
    GROUP BY SUBSTR(vc.h_venda, 1, 2)
    ORDER BY hora ASC
  `;
  const salesByHour = db.prepare(salesByHourSql).all(curStart, curEnd, ...filter.params);

  // Curva ABC de Produtos
  const abcSql = `
    SELECT 
      p.ref_id,
      COALESCE(p.nome, vi.ref_id) as produto,
      COALESCE(m.nome, 'Sem Marca') as marca,
      COALESCE(SUM(CASE WHEN vi.entrada = 0 THEN vi.total_liq ELSE -vi.total_liq END), 0) as faturamento,
      COALESCE(SUM(CASE WHEN vi.entrada = 0 THEN vi.qtd ELSE -vi.qtd END), 0) as quantidade
    FROM venda_item vi
    JOIN venda_cab vc ON vc.loja_id = vi.loja_id AND vc.d_venda = vi.d_venda AND vc.c_venda = vi.c_venda
    LEFT JOIN produto p ON vi.ref_id = p.ref_id
    LEFT JOIN marca m ON p.marca_id = m.id
    WHERE vc.d_venda BETWEEN ? AND ? AND vc.cancelada = 0 AND vi.cancelado = 0 ${filter.whereSql}
    GROUP BY p.ref_id
    HAVING faturamento > 0 OR quantidade > 0
  `;
  const allAbcItems = db.prepare(abcSql).all(curStart, curEnd, ...filter.params) as {
    ref_id: string;
    produto: string;
    marca: string;
    faturamento: number;
    quantidade: number;
  }[];

  // Cálculo da Curva ABC por Faturamento (Valor) com parâmetros 20% (A), 30% (B), 50% (C)
  const sortedByValor = [...allAbcItems].sort((a, b) => b.faturamento - a.faturamento);
  const totalValor = sortedByValor.reduce((acc, item) => acc + item.faturamento, 0);
  const totalQtd = sortedByValor.reduce((acc, item) => acc + item.quantidade, 0);
  const countTotal = sortedByValor.length;

  const countA = Math.max(1, Math.ceil(countTotal * 0.20));
  const countB = Math.max(1, Math.ceil(countTotal * 0.30));

  let accValor = 0;
  const itemsByValor = sortedByValor.map((item, idx) => {
    accValor += item.faturamento;
    const classe = idx < countA ? 'A' : (idx < countA + countB ? 'B' : 'C');
    const pctAcumulado = totalValor > 0 ? (accValor / totalValor) * 100 : 0;
    return {
      ...item,
      classe,
      pctAcumulado,
    };
  });

  // Cálculo da Curva ABC por Quantidade (Volume)
  const sortedByQtd = [...allAbcItems].sort((a, b) => b.quantidade - a.quantidade);
  let accQtd = 0;
  const itemsByQtd = sortedByQtd.map((item, idx) => {
    accQtd += item.quantidade;
    const classe = idx < countA ? 'A' : (idx < countA + countB ? 'B' : 'C');
    const pctAcumulado = totalQtd > 0 ? (accQtd / totalQtd) * 100 : 0;
    return {
      ...item,
      classe,
      pctAcumulado,
    };
  });

  const resumoValor = {
    totalItens: countTotal,
    totalFaturamento: totalValor,
    classeA: {
      qtdProdutos: itemsByValor.filter(i => i.classe === 'A').length,
      faturamento: itemsByValor.filter(i => i.classe === 'A').reduce((acc, i) => acc + i.faturamento, 0),
      pctFaturamento: totalValor > 0 ? (itemsByValor.filter(i => i.classe === 'A').reduce((acc, i) => acc + i.faturamento, 0) / totalValor) * 100 : 0,
    },
    classeB: {
      qtdProdutos: itemsByValor.filter(i => i.classe === 'B').length,
      faturamento: itemsByValor.filter(i => i.classe === 'B').reduce((acc, i) => acc + i.faturamento, 0),
      pctFaturamento: totalValor > 0 ? (itemsByValor.filter(i => i.classe === 'B').reduce((acc, i) => acc + i.faturamento, 0) / totalValor) * 100 : 0,
    },
    classeC: {
      qtdProdutos: itemsByValor.filter(i => i.classe === 'C').length,
      faturamento: itemsByValor.filter(i => i.classe === 'C').reduce((acc, i) => acc + i.faturamento, 0),
      pctFaturamento: totalValor > 0 ? (itemsByValor.filter(i => i.classe === 'C').reduce((acc, i) => acc + i.faturamento, 0) / totalValor) * 100 : 0,
    },
  };

  const resumoQtd = {
    totalItens: countTotal,
    totalVolume: totalQtd,
    classeA: {
      qtdProdutos: itemsByQtd.filter(i => i.classe === 'A').length,
      volume: itemsByQtd.filter(i => i.classe === 'A').reduce((acc, i) => acc + i.quantidade, 0),
      pctVolume: totalQtd > 0 ? (itemsByQtd.filter(i => i.classe === 'A').reduce((acc, i) => acc + i.quantidade, 0) / totalQtd) * 100 : 0,
    },
    classeB: {
      qtdProdutos: itemsByQtd.filter(i => i.classe === 'B').length,
      volume: itemsByQtd.filter(i => i.classe === 'B').reduce((acc, i) => acc + i.quantidade, 0),
      pctVolume: totalQtd > 0 ? (itemsByQtd.filter(i => i.classe === 'B').reduce((acc, i) => acc + i.quantidade, 0) / totalQtd) * 100 : 0,
    },
    classeC: {
      qtdProdutos: itemsByQtd.filter(i => i.classe === 'C').length,
      volume: itemsByQtd.filter(i => i.classe === 'C').reduce((acc, i) => acc + i.quantidade, 0),
      pctVolume: totalQtd > 0 ? (itemsByQtd.filter(i => i.classe === 'C').reduce((acc, i) => acc + i.quantidade, 0) / totalQtd) * 100 : 0,
    },
  };

  res.json({
    dateRange: { curStart, curEnd },
    salesByHour,
    curvaAbc: {
      porValor: {
        resumo: resumoValor,
        items: itemsByValor,
      },
      porQuantidade: {
        resumo: resumoQtd,
        items: itemsByQtd,
      },
    },
  });
});

// 3. PRODUTOS E ESTOQUE API (Com Lucro Bruto Potencial, Faixa de Giro e Estoque Parado)
dashboardRouter.get('/products', (req: Request, res: Response) => {
  const { lojaId, search } = req.query;
  const idleDaysThreshold = parseInt(req.query.idleDays as string, 10) || 30;
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 10);
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];

  if (lojaId) {
    conditions.push('e.loja_id = ?');
    params.push(Number(lojaId));
  }
  if (search && String(search).trim() !== '') {
    const q = `%${String(search).trim()}%`;
    conditions.push('(p.nome LIKE ? OR p.ref_id LIKE ? OR m.nome LIKE ?)');
    params.push(q, q, q);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const stockKpisSql = `
    SELECT 
      COUNT(DISTINCT e.ref_id) as total_produtos,
      COALESCE(SUM(e.qtd), 0) as total_estoque,
      COALESCE(SUM(e.qtd * p.preco_custo), 0) as valor_estoque_custo,
      COALESCE(SUM(e.qtd * p.preco_tab1), 0) as valor_estoque_venda
    FROM estoque e
    JOIN produto p ON e.ref_id = p.ref_id
    LEFT JOIN marca m ON p.marca_id = m.id
    ${whereClause}
  `;
  const rawKpis = db.prepare(stockKpisSql).get(...params) as any;
  const custo = Number(rawKpis?.valor_estoque_custo) || 0;
  const venda = Number(rawKpis?.valor_estoque_venda) || 0;
  const lucroBrutoPotencial = venda - custo;
  const margemPotencialPct = venda > 0 ? (lucroBrutoPotencial / venda) * 100 : 0;

  const stockKpis = {
    total_produtos: Number(rawKpis?.total_produtos) || 0,
    total_estoque: Number(rawKpis?.total_estoque) || 0,
    valor_estoque_custo: custo, // Capital investido
    valor_estoque_venda: venda, // Potencial de faturamento
    lucro_bruto_potencial: lucroBrutoPotencial,
    margem_potencial_pct: margemPotencialPct,
  };

  // Análise de Estoque e Idade da Última Venda por Produto
  const stockProductsSql = `
    SELECT 
      p.ref_id,
      p.nome as produto,
      COALESCE(m.nome, 'Sem Marca') as marca,
      SUM(e.qtd) as estoque,
      p.preco_custo as custo_unitario,
      p.preco_tab1 as preco_venda,
      SUM(e.qtd * p.preco_custo) as valor_parado,
      (
        SELECT MAX(vc.d_venda)
        FROM venda_item vi
        JOIN venda_cab vc ON vc.loja_id = vi.loja_id AND vc.d_venda = vi.d_venda AND vc.c_venda = vi.c_venda
        WHERE vi.ref_id = p.ref_id AND vc.cancelada = 0 AND vi.cancelado = 0
        ${lojaId ? 'AND vc.loja_id = ' + Number(lojaId) : ''}
      ) as ultima_venda
    FROM estoque e
    JOIN produto p ON e.ref_id = p.ref_id
    LEFT JOIN marca m ON p.marca_id = m.id
    ${whereClause}
    GROUP BY p.ref_id
    HAVING estoque > 0
    ORDER BY valor_parado DESC
  `;
  const allStockProducts = db.prepare(stockProductsSql).all(...params) as any[];

  const now = new Date();
  const agingProducts = allStockProducts.map(p => {
    let diasSemVenda = 999;
    if (p.ultima_venda) {
      const dt = new Date(p.ultima_venda);
      const diffMs = now.getTime() - dt.getTime();
      diasSemVenda = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }
    return {
      ...p,
      dias_sem_venda: diasSemVenda,
      ultima_venda_formatada: p.ultima_venda 
        ? `${p.ultima_venda.substring(8, 10)}/${p.ultima_venda.substring(5, 7)}/${p.ultima_venda.substring(0, 4)}` 
        : 'Sem vendas registradas',
    };
  });

  // Distribuição por Faixa de Giro
  let valorAte30d = 0, qtdAte30d = 0;
  let valor31a60d = 0, qtd31a60d = 0;
  let valor61a90d = 0, qtd61a90d = 0;
  let valorMais90d = 0, qtdMais90d = 0;

  for (const p of agingProducts) {
    if (p.dias_sem_venda <= 30) {
      valorAte30d += p.valor_parado;
      qtdAte30d += p.estoque;
    } else if (p.dias_sem_venda <= 60) {
      valor31a60d += p.valor_parado;
      qtd31a60d += p.estoque;
    } else if (p.dias_sem_venda <= 90) {
      valor61a90d += p.valor_parado;
      qtd61a90d += p.estoque;
    } else {
      valorMais90d += p.valor_parado;
      qtdMais90d += p.estoque;
    }
  }

  const totalCapital = custo || 1;
  const agingDistribution = {
    ate30d: { label: 'Vendido nos últimos 30 dias', valor: valorAte30d, qtd: qtdAte30d, pct: (valorAte30d / totalCapital) * 100, color: '#10b981' },
    de31a60d: { label: '31–60 dias sem venda', valor: valor31a60d, qtd: qtd31a60d, pct: (valor31a60d / totalCapital) * 100, color: '#eab308' },
    de61a90d: { label: '61–90 dias sem venda', valor: valor61a90d, qtd: qtd61a90d, pct: (valor61a90d / totalCapital) * 100, color: '#f97316' },
    mais90d: { label: '+90 dias sem venda', valor: valorMais90d, qtd: qtdMais90d, pct: (valorMais90d / totalCapital) * 100, color: '#ef4444' },
  };

  // Produtos com estoque parado no limiar selecionado (ex: >= 30, 60, 90, 180)
  const idleProducts = agingProducts.filter(p => p.dias_sem_venda >= idleDaysThreshold);
  const totalIdleCapital = idleProducts.reduce((acc, p) => acc + p.valor_parado, 0);

  const top10Idle = idleProducts.slice(0, 10);

  // Paginação da tabela de produtos com estoque parado
  const total = idleProducts.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paginatedIdle = idleProducts.slice(offset, offset + limit);

  res.json({
    kpis: stockKpis,
    agingDistribution,
    idleDaysThreshold,
    totalIdleCapital,
    top10Idle,
    total,
    page,
    limit,
    totalPages,
    products: paginatedIdle,
  });
});

// 4. CLIENTES PAGINADO E ANIVERSARIANTES API (Com Busca)
dashboardRouter.get('/customers', (req: Request, res: Response) => {
  const { period, startDate, endDate, search } = req.query;
  const { curStart, curEnd } = resolveDateRange(period as string, startDate as string, endDate as string);

  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 10);
  const offset = (page - 1) * limit;

  // Aniversariantes no período (MM-DD entre start e end)
  const startMMDD = curStart.length >= 10 ? curStart.substring(5, 10) : '01-01';
  const endMMDD = curEnd.length >= 10 ? curEnd.substring(5, 10) : '12-31';

  let bdayWhere = `SUBSTR(data_nasc, 6, 5) BETWEEN ? AND ?`;
  let bdayParams: any[] = [startMMDD, endMMDD];
  if (startMMDD > endMMDD) {
    bdayWhere = `(SUBSTR(data_nasc, 6, 5) >= ? OR SUBSTR(data_nasc, 6, 5) <= ?)`;
    bdayParams = [startMMDD, endMMDD];
  }

  const custConditions: string[] = [];
  const custParams: any[] = [];

  if (search && String(search).trim() !== '') {
    const q = `%${String(search).trim()}%`;
    custConditions.push('(c.nome LIKE ? OR c.cpf LIKE ? OR c.email LIKE ? OR c.cnpj LIKE ?)');
    custParams.push(q, q, q, q);

    bdayWhere += ` AND (nome LIKE ? OR cpf LIKE ? OR email LIKE ? OR cnpj LIKE ?)`;
    bdayParams.push(q, q, q, q);
  }

  const bdaySql = `
    SELECT 
      id_cliente,
      nome,
      data_nasc,
      SUBSTR(data_nasc, 9, 2) || '/' || SUBSTR(data_nasc, 6, 2) as dia_aniversario,
      email,
      cpf,
      cnpj
    FROM cliente
    WHERE data_nasc IS NOT NULL AND data_nasc != '' AND ${bdayWhere}
    ORDER BY SUBSTR(data_nasc, 6, 5) ASC
  `;

  const birthdayCustomers = db.prepare(bdaySql).all(...bdayParams);

  const custWhereClause = custConditions.length > 0 ? `WHERE ${custConditions.join(' AND ')}` : '';

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM cliente c ${custWhereClause}`).get(...custParams) as { total: number };
  const total = countRow?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const sql = `
    SELECT 
      c.id_cliente,
      c.nome,
      c.pessoa,
      c.cpf,
      c.cnpj,
      c.email,
      c.data_nasc,
      COUNT(DISTINCT CASE WHEN vc.cancelada = 0 THEN vc.loja_id || '-' || vc.d_venda || '-' || vc.c_venda END) as total_compras,
      COALESCE(SUM(CASE WHEN vc.cancelada = 0 AND vi.cancelado = 0 AND vi.entrada = 0 THEN vi.total_liq ELSE 0 END), 0) as faturamento_total
    FROM cliente c
    LEFT JOIN venda_cab vc ON c.id_cliente = vc.cliente_id AND c.loja_id = vc.loja_id
    LEFT JOIN venda_item vi ON vc.loja_id = vi.loja_id AND vc.d_venda = vi.d_venda AND vc.c_venda = vi.c_venda
    ${custWhereClause}
    GROUP BY c.id_cliente, c.loja_id
    ORDER BY faturamento_total DESC, c.nome ASC
    LIMIT ? OFFSET ?
  `;

  const customers = db.prepare(sql).all(...custParams, limit, offset);

  res.json({
    dateRange: { curStart, curEnd },
    total,
    page,
    limit,
    totalPages,
    birthdayCount: birthdayCustomers.length,
    birthdayCustomers,
    customers,
  });
});

// 5. LOJAS COMPARATIVO E RANKING API
dashboardRouter.get('/store-comparison', (req: Request, res: Response) => {
  const { period, startDate, endDate } = req.query;
  const { curStart, curEnd } = resolveDateRange(period as string, startDate as string, endDate as string);

  const sql = `
    SELECT 
      l.id as lojaId,
      l.nome as lojaNome,
      l.cnpj,
      l.id_loja_erp,
      COALESCE(SUM(CASE WHEN vc.cancelada = 0 AND vi.cancelado = 0 AND vi.entrada = 0 THEN vi.total_liq ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN vc.cancelada = 0 AND vi.cancelado = 0 AND vi.entrada = 1 THEN vi.total_liq ELSE 0 END), 0) as faturamento,

      COUNT(DISTINCT CASE WHEN vc.cancelada = 0 THEN vc.loja_id || '-' || vc.d_venda || '-' || vc.c_venda END) as vendas,

      COALESCE(SUM(CASE WHEN vc.cancelada = 0 AND vi.cancelado = 0 AND vi.entrada = 0 THEN vi.qtd ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN vc.cancelada = 0 AND vi.cancelado = 0 AND vi.entrada = 1 THEN vi.qtd ELSE 0 END), 0) as itens,

      COALESCE(SUM(CASE WHEN vc.cancelada = 0 AND vi.cancelado = 0 AND vi.entrada = 0 THEN vi.total_bruto - vi.total_liq ELSE 0 END), 0) as totalDesconto,

      COALESCE(SUM(CASE WHEN vc.cancelada = 0 AND vi.cancelado = 0 AND vi.entrada = 0 THEN vi.qtd * p.preco_custo ELSE 0 END), 0) as custoTotal
    FROM loja l
    LEFT JOIN venda_cab vc ON l.id = vc.loja_id AND vc.d_venda BETWEEN ? AND ?
    LEFT JOIN venda_item vi ON vc.loja_id = vi.loja_id AND vc.d_venda = vi.d_venda AND vc.c_venda = vi.c_venda
    LEFT JOIN produto p ON vi.ref_id = p.ref_id
    GROUP BY l.id
    ORDER BY faturamento DESC
  `;

  const rows = db.prepare(sql).all(curStart, curEnd);

  const stores = rows.map((r: any, idx: number) => {
    const faturamento = Number(r.faturamento) || 0;
    const vendas = Number(r.vendas) || 0;
    const itens = Number(r.itens) || 0;
    const totalDesconto = Number(r.totalDesconto) || 0;
    const custoTotal = Number(r.custoTotal) || 0;

    const ticketMedio = vendas > 0 ? faturamento / vendas : 0;
    const margemEstimada = faturamento - custoTotal;
    const margemPct = faturamento > 0 ? (margemEstimada / faturamento) * 100 : 0;

    return {
      rank: idx + 1,
      lojaId: r.lojaId,
      lojaNome: r.lojaNome || `Loja #${r.id_loja_erp || r.lojaId}`,
      cnpj: r.cnpj,
      faturamento,
      vendas,
      ticketMedio,
      itens,
      totalDesconto,
      margemEstimada,
      margemPct,
    };
  });

  res.json({ stores });
});
