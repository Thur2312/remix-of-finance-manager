import { describe, it, expect } from 'vitest';
import { buildSkuCostOptions, findSkuCost, type RawSkuCost } from './sku-cost-lookup';

const row = (p: Partial<RawSkuCost> & { sku: string }): RawSkuCost => ({
  item_name: null, cost: 0, packaging_cost: null, other_costs: null, tax_percent: null, ...p,
});

describe('buildSkuCostOptions', () => {
  it('mapeia custo, embalagem+outros e imposto', () => {
    const [o] = buildSkuCostOptions([
      row({ sku: 'CAM-P', item_name: 'Camiseta P', cost: 12, packaging_cost: 1.5, other_costs: 0.5, tax_percent: 4 }),
    ]);
    expect(o).toMatchObject({ key: 'camp', sku: 'CAM-P', nome: 'Camiseta P', custo: 12, custoVar: 2, impostoPct: 4 });
  });

  it('dedup por skuKey: primeira ocorrência (mais recente) vence', () => {
    const opts = buildSkuCostOptions([
      row({ sku: 'CAM P', cost: 15 }),   // effective_from mais novo → caller manda primeiro
      row({ sku: 'cam-p', cost: 12 }),
    ]);
    expect(opts).toHaveLength(1);
    expect(opts[0].custo).toBe(15);
  });

  it('descarta linha sem nenhum custo', () => {
    expect(buildSkuCostOptions([row({ sku: 'X', cost: 0 })])).toEqual([]);
  });

  it('mantém linha só com custo variável (embalagem)', () => {
    const [o] = buildSkuCostOptions([row({ sku: 'Y', packaging_cost: 3 })]);
    expect(o).toMatchObject({ custo: 0, custoVar: 3 });
  });

  it('ordena por nome (fallback sku), pt-BR', () => {
    const opts = buildSkuCostOptions([
      row({ sku: 'Z', item_name: 'Ábaco', cost: 1 }),
      row({ sku: 'A', item_name: 'Bola', cost: 1 }),
    ]);
    expect(opts.map(o => o.sku)).toEqual(['Z', 'A']);
  });
});

describe('findSkuCost', () => {
  const opts = buildSkuCostOptions([row({ sku: 'CAM-AZUL-P', cost: 10 })]);

  it('casa ignorando caixa e separadores', () => {
    expect(findSkuCost(opts, 'cam azul p')?.custo).toBe(10);
    expect(findSkuCost(opts, 'CAM_AZUL_P')?.custo).toBe(10);
  });

  it('não casa SKU diferente nem vazio', () => {
    expect(findSkuCost(opts, 'CAM')).toBeNull();
    expect(findSkuCost(opts, '')).toBeNull();
    expect(findSkuCost(opts, null)).toBeNull();
  });
});
