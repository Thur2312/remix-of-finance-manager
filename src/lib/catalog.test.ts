import { describe, it, expect } from 'vitest';
import { buildCatalog, rankTopProdutos, type BuildCatalogInput } from './catalog';

const shopeeOrder = (id: string, items: { sku: string; name?: string; qty: number; price: number }[]) => ({
  id,
  order_items: items.map((it, i) => ({
    external_item_id: `${id}-${i}`, item_name: it.name ?? it.sku, sku: it.sku,
    quantity: it.qty, total_price: it.price,
  })),
});
const escrow = (orderId: string, net: number) => ({ order_id: orderId, payment_method: 'escrow', net_amount: net });

const baseInput = (p: Partial<BuildCatalogInput> = {}): BuildCatalogInput => ({
  shopeeOrders: [],
  shopeePayments: [],
  mlOrders: [],
  tiktokOrders: [],
  costs: [],
  stock: [],
  inventoryOverrides: [],
  anuncios: [],
  meta: [],
  windowDays: 30,
  isExcludedStatus: () => false,
  ...p,
});

describe('buildCatalog', () => {
  it('une venda Shopee + custo cadastrado → lucro e margem por SKU', () => {
    const rows = buildCatalog(baseInput({
      shopeeOrders: [shopeeOrder('o1', [{ sku: 'A', name: 'Camisa', qty: 2, price: 200 }])],
      shopeePayments: [escrow('o1', 164)], // reteve 36
      costs: [{ sku: 'A', custoTotal: 30 }],
    }));
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.marketplaces).toEqual(['shopee']);
    expect(r.faturamento).toBe(200);
    expect(r.retidoPlataforma).toBe(36);
    expect(r.custoUnit).toBe(30);
    expect(r.custoOrigem).toBe('cadastrado');
    expect(r.lucro).toBe(200 - 36 - 60); // 104
    expect(r.margemPct).toBe(52);
  });

  it('sem custo cadastrado e sem custo de marketplace → lucro null', () => {
    const rows = buildCatalog(baseInput({
      shopeeOrders: [shopeeOrder('o1', [{ sku: 'A', qty: 1, price: 100 }])],
      shopeePayments: [escrow('o1', 80)],
    }));
    expect(rows[0].custoOrigem).toBe('nenhum');
    expect(rows[0].lucro).toBeNull();
    expect(rows[0].margemPct).toBeNull();
  });

  it('mesmo SKU vende em Shopee e ML → uma linha, marketplaces somados', () => {
    const rows = buildCatalog(baseInput({
      shopeeOrders: [shopeeOrder('o1', [{ sku: 'CAM-P', qty: 1, price: 100 }])],
      shopeePayments: [escrow('o1', 82)],
      mlOrders: [{
        sku: 'cam p', nome_produto: 'Camisa P', quantidade: 2, total_faturado: 240,
        taxa_ml: 30, frete_ml: 10, custo_unitario: 25, status_pedido: 'paid',
      }],
    }));
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.marketplaces).toEqual(['mercadolivre', 'shopee']);
    expect(r.unidadesVendidas).toBe(3);
    expect(r.faturamento).toBe(340);
    expect(r.retidoPlataforma).toBe(18 + 40); // shopee 18 + ml (30+10)
    expect(r.custoUnit).toBe(25); // veio do marketplace (ML)
    expect(r.custoOrigem).toBe('marketplace');
  });

  it('status excluído (cancelado/devolvido) não conta', () => {
    const rows = buildCatalog(baseInput({
      mlOrders: [{
        sku: 'A', nome_produto: 'A', quantidade: 1, total_faturado: 100,
        taxa_ml: 12, frete_ml: 0, custo_unitario: 0, status_pedido: 'cancelled',
      }],
      isExcludedStatus: (s) => s === 'cancelled',
    }));
    expect(rows).toHaveLength(0);
  });

  it('item sem SKU cai numa linha agrupadora "sem SKU", sempre por último', () => {
    const rows = buildCatalog(baseInput({
      shopeeOrders: [
        shopeeOrder('o1', [{ sku: 'A', qty: 1, price: 500 }]),
        shopeeOrder('o2', [{ sku: '', name: 'Item solto', qty: 1, price: 50 }]),
      ],
      shopeePayments: [escrow('o1', 400), escrow('o2', 40)],
    }));
    expect(rows).toHaveLength(2);
    expect(rows[0].temSku).toBe(true);
    expect(rows[1].temSku).toBe(false);
    expect(rows[1].skuKey).toBe('');
  });

  it('override de estoque manual vence o sincronizado; cobertura = estoque / giro', () => {
    const rows = buildCatalog(baseInput({
      windowDays: 30,
      shopeeOrders: [shopeeOrder('o1', [{ sku: 'A', qty: 30, price: 3000 }])],
      shopeePayments: [escrow('o1', 2400)],
      stock: [{ sku: 'A', stockUnits: 5, source: 'shopee' }],
      inventoryOverrides: [{ sku: 'A', stockUnits: 20, active: true }],
    }));
    const r = rows[0];
    expect(r.estoque).toBe(20);
    expect(r.estoqueOrigem).toBe('override');
    expect(r.giroDia).toBe(1); // 30 un / 30 dias
    expect(r.diasDeCobertura).toBe(20);
  });

  it('estoque desconhecido → cobertura null; giro 0 com estoque → Infinity', () => {
    const semEstoque = buildCatalog(baseInput({
      shopeeOrders: [shopeeOrder('o1', [{ sku: 'A', qty: 1, price: 100 }])],
      shopeePayments: [escrow('o1', 80)],
    }));
    expect(semEstoque[0].diasDeCobertura).toBeNull();

    const semGiro = buildCatalog(baseInput({
      stock: [{ sku: 'B', stockUnits: 10, source: 'import' }],
      inventoryOverrides: [{ sku: 'B', stockUnits: 10, active: true }],
      anuncios: [{ sku: 'B', valorVenda: 50, custo: 10 }],
    }));
    // B nunca vendeu → não tem linha (catálogo é dirigido por venda)
    expect(semGiro).toHaveLength(0);
  });

  it('alias_of funde dois skuKey num só', () => {
    const rows = buildCatalog(baseInput({
      shopeeOrders: [shopeeOrder('o1', [{ sku: 'CAM', qty: 1, price: 100 }])],
      shopeePayments: [escrow('o1', 80)],
      mlOrders: [{
        sku: 'CAMISA', nome_produto: 'Camisa', quantidade: 1, total_faturado: 120,
        taxa_ml: 15, frete_ml: 0, custo_unitario: 0, status_pedido: 'paid',
      }],
      meta: [{ skuKey: 'camisa', displayName: 'Camisa Oficial', archived: false, aliasOf: 'cam' }],
    }));
    expect(rows).toHaveLength(1);
    expect(rows[0].unidadesVendidas).toBe(2);
    expect(rows[0].marketplaces).toEqual(['mercadolivre', 'shopee']);
  });

  it('displayName e archived vêm de product_catalog', () => {
    const rows = buildCatalog(baseInput({
      shopeeOrders: [shopeeOrder('o1', [{ sku: 'A', name: 'nome cru', qty: 1, price: 100 }])],
      shopeePayments: [escrow('o1', 80)],
      meta: [{ skuKey: 'a', displayName: 'Nome Bonito', archived: true, aliasOf: null }],
    }));
    expect(rows[0].nome).toBe('Nome Bonito');
    expect(rows[0].archived).toBe(true);
  });

  it('preço/custo cadastrado vêm do anúncio quando o SKU casa', () => {
    const rows = buildCatalog(baseInput({
      shopeeOrders: [shopeeOrder('o1', [{ sku: 'A-1', qty: 1, price: 100 }])],
      shopeePayments: [escrow('o1', 80)],
      anuncios: [{ sku: 'a1', valorVenda: 99.9, custo: 22 }],
    }));
    expect(rows[0].precoCadastrado).toBe(99.9);
    expect(rows[0].custoCadastrado).toBe(22);
  });
});

describe('rankTopProdutos', () => {
  const rows = buildCatalog(baseInput({
    shopeeOrders: [
      shopeeOrder('o1', [{ sku: 'A', qty: 10, price: 1000 }]),
      shopeeOrder('o2', [{ sku: 'B', qty: 2, price: 400 }]),
      shopeeOrder('o3', [{ sku: 'C', qty: 5, price: 100 }]),
    ],
    shopeePayments: [escrow('o1', 800), escrow('o2', 340), escrow('o3', 82)],
    costs: [{ sku: 'A', custoTotal: 60 }, { sku: 'B', custoTotal: 10 }, { sku: 'C', custoTotal: 5 }],
  }));

  it('por faturamento', () => {
    expect(rankTopProdutos(rows, { by: 'faturamento', limit: 2 }).map(r => r.sku)).toEqual(['A', 'B']);
  });

  it('por lucro difere de faturamento', () => {
    // faturamento: A(1000) > B(400) > C(100)
    // lucro:       B(320)  > A(200) > C(57)
    expect(rankTopProdutos(rows, { by: 'faturamento', limit: 1 })[0].sku).toBe('A');
    const top = rankTopProdutos(rows, { by: 'lucro', limit: 3 });
    expect(top.map(r => r.sku)).toEqual(['B', 'A', 'C']);
  });

  it('exclui arquivados e linhas sem SKU', () => {
    const withArchived = buildCatalog(baseInput({
      shopeeOrders: [shopeeOrder('o1', [{ sku: 'X', qty: 1, price: 999 }])],
      shopeePayments: [escrow('o1', 800)],
      meta: [{ skuKey: 'x', displayName: null, archived: true, aliasOf: null }],
    }));
    expect(rankTopProdutos(withArchived, { by: 'faturamento' })).toHaveLength(0);
  });

  it('por margem ignora SKU sem custo (margem null)', () => {
    const mixed = buildCatalog(baseInput({
      shopeeOrders: [
        shopeeOrder('o1', [{ sku: 'A', qty: 1, price: 100 }]),
        shopeeOrder('o2', [{ sku: 'B', qty: 1, price: 100 }]),
      ],
      shopeePayments: [escrow('o1', 80), escrow('o2', 80)],
      costs: [{ sku: 'A', custoTotal: 10 }],
    }));
    const top = rankTopProdutos(mixed, { by: 'margem' });
    expect(top.map(r => r.sku)).toEqual(['A']);
  });
});
