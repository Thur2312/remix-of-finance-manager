import { describe, it, expect } from 'vitest';
import { computeMaxCost, type MaxCostInputs } from './max-cost';

const base = (p: Partial<MaxCostInputs> = {}): MaxCostInputs => ({
  marketplace: 'Shopee',
  precoVenda: 100,
  modo: 'margem',
  margemAlvoPct: 20,
  custoVar: 2,
  impostoPct: 6,
  afiliadosPct: 0,
  outrasDespesas: 0,
  ...p,
});

describe('computeMaxCost', () => {
  it('resolve o custo máximo pela fórmula inversa da precificação', () => {
    // Shopee a R$100 → comissão 14%, taxa fixa R$20 (getShopeeRates)
    // receitaLiquida = 100·(1 − 0,14 − 0,06) − (2 + 20 + 0) = 80 − 22 = 58
    // alvo 20% de R$100 = 20 → custoMaximo = 58 − 20 = 38
    const r = computeMaxCost(base());
    expect(r.comissaoPct).toBe(14);
    expect(r.taxaFixa).toBe(20);
    expect(r.custosFixosVenda).toBe(22);
    expect(r.lucroAlvoReais).toBe(20);
    expect(r.custoMaximo).toBe(38);
    expect(r.precoViavel).toBe(true);
  });

  it('pagar exatamente o custo máximo entrega a margem alvo', () => {
    const r = computeMaxCost(base({ custoOfertado: 38 }));
    expect(r.comCustoOfertado?.folga).toBe(0);
    expect(r.comCustoOfertado?.margemPct).toBeCloseTo(20, 5);
    expect(r.comCustoOfertado?.veredito).toBe('ok');
  });

  it('fornecedor abaixo do teto → folga positiva, veredito ok', () => {
    const r = computeMaxCost(base({ custoOfertado: 30 }));
    expect(r.comCustoOfertado?.folga).toBe(8);
    expect(r.comCustoOfertado?.lucro).toBeGreaterThan(20);
    expect(r.comCustoOfertado?.veredito).toBe('ok');
  });

  it('fornecedor acima do teto mas ainda com lucro → aperta', () => {
    const r = computeMaxCost(base({ custoOfertado: 45 }));
    expect(r.comCustoOfertado?.folga).toBeLessThan(0);
    expect(r.comCustoOfertado?.lucro).toBeGreaterThan(0);
    expect(r.comCustoOfertado?.veredito).toBe('aperta');
  });

  it('fornecedor que zera ou vira prejuízo → estoura', () => {
    const r = computeMaxCost(base({ custoOfertado: 60 }));
    expect(r.comCustoOfertado?.lucro).toBeLessThanOrEqual(0);
    expect(r.comCustoOfertado?.veredito).toBe('estoura');
  });

  it('margem alvo acima do teto do preço → custo máximo negativo, inviável', () => {
    const r = computeMaxCost(base({ margemAlvoPct: 80 }));
    expect(r.custoMaximo).toBeLessThan(0);
    expect(r.precoViavel).toBe(false);
    expect(r.margemTetoPct).toBeLessThan(80);
  });

  it('modo lucro: alvo em R$ por unidade em vez de %', () => {
    // receitaLiquida 58 (mesma base) − lucroAlvo 15 = 43
    const r = computeMaxCost(base({ modo: 'lucro', lucroAlvo: 15, margemAlvoPct: undefined }));
    expect(r.lucroAlvoReais).toBe(15);
    expect(r.custoMaximo).toBe(43);
  });

  it('marketplace manual usa comissão/taxa informadas', () => {
    const r = computeMaxCost(base({
      marketplace: '', comissaoPctManual: 10, taxaFixaManual: 5, impostoPct: 0,
    }));
    // receitaLiquida = 100·(1 − 0,10) − (2 + 5) = 90 − 7 = 83 ; alvo 20 → 63
    expect(r.comissaoPct).toBe(10);
    expect(r.taxaFixa).toBe(5);
    expect(r.custoMaximo).toBe(63);
  });

  it('margemTetoPct desconta taxas e custos fixos, não o produto', () => {
    const r = computeMaxCost(base());
    // receitaLiquida 58 / preço 100 = 58%
    expect(r.margemTetoPct).toBe(58);
  });

  it('sem custo ofertado, comCustoOfertado é null', () => {
    expect(computeMaxCost(base()).comCustoOfertado).toBeNull();
  });

  it('TikTok muda de faixa conforme o preço de venda', () => {
    const abaixo = computeMaxCost(base({ marketplace: 'TiktokShop', precoVenda: 40 }));
    const acima = computeMaxCost(base({ marketplace: 'TiktokShop', precoVenda: 60 }));
    expect(abaixo.comissaoPct).toBe(10);
    expect(acima.comissaoPct).toBe(6);
  });
});
