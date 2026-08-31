import { describe, it, expect } from 'vitest';
import {
  precoPorMargem,
  precoPorLucro,
  apurar,
  apurarAnuncio,
  margemMaxViavelPct,
  somaTaxasPct,
  type PricingInputs,
} from './pricing';

// Configuração da seção 2.2 do DIAGNOSTICO-FINANCEIRO.md:
// custo R$45, custo variável R$0,30, TikTok Shop, comissão 6%, taxa fixa R$6,
// imposto 6%, desconto 40%. Afiliados varia.
const base = (afiliadosPct: number): PricingInputs => ({
  custo: 45,
  custoVar: 0.3,
  taxaFixa: 6,
  comissaoPct: 6,
  impostoPct: 6,
  afiliadosPct,
});

describe('precoPorMargem — cenários da seção 2.2 (devem seguir dando 20,0%)', () => {
  it('afiliados 10% → R$88,45', () => {
    expect(precoPorMargem(base(10), 20).preco).toBeCloseTo(88.45, 1);
  });
  it('afiliados 1% → R$76,57', () => {
    expect(precoPorMargem(base(1), 20).preco).toBeCloseTo(76.57, 1);
  });
  it('afiliados 0% → R$75,44', () => {
    expect(precoPorMargem(base(0), 20).preco).toBeCloseTo(75.44, 1);
  });
});

describe('BUG-05 — modo "Por Preço": custo some, preço fixo, margem sobe', () => {
  it('preço fixo 88,45, afiliados 10% → 0% → margem 30,0% e lucro ~R$26,54', () => {
    const semAfiliados = apurar(base(0), 88.45);
    expect(semAfiliados.margemPct).toBeCloseTo(30.0, 1);
    expect(semAfiliados.lucro).toBeCloseTo(26.54, 1);
  });
  it('com afiliados 10% o mesmo preço rende 20,0% / ~R$17,69', () => {
    const comAfiliados = apurar(base(10), 88.45);
    expect(comAfiliados.margemPct).toBeCloseTo(20.0, 1);
    expect(comAfiliados.lucro).toBeCloseTo(17.69, 1);
  });
});

describe('simetria: precoPorMargem e apurar são inversos exatos', () => {
  it('o preço sugerido para 20% apurado de volta dá 20%', () => {
    const i = base(10);
    const { preco } = precoPorMargem(i, 20);
    expect(apurar(i, preco).margemPct).toBeCloseTo(20, 10);
  });
  it('vale para qualquer alvo de margem', () => {
    const i = base(3);
    for (const alvo of [5, 15, 25, 35, 50]) {
      const { preco } = precoPorMargem(i, alvo);
      expect(apurar(i, preco).margemPct).toBeCloseTo(alvo, 10);
    }
  });
});

describe('precoPorLucro', () => {
  it('o preço sugerido para lucro-alvo apurado de volta dá o mesmo lucro', () => {
    const i = base(5);
    const { preco } = precoPorLucro(i, 20);
    expect(apurar(i, preco).lucro).toBeCloseTo(20, 8);
  });
});

describe('BUG-07 — margem/lucro inviável (Σ percentuais ≥ 100%)', () => {
  it('margem desejada acima da margem máxima viável → inviavel, preço 0', () => {
    const i = base(10); // Σ taxas = 22% → margem máx viável = 78%
    expect(margemMaxViavelPct(i)).toBeCloseTo(78, 6);
    expect(precoPorMargem(i, 80)).toEqual({ preco: 0, inviavel: true });
    expect(precoPorMargem(i, 78)).toEqual({ preco: 0, inviavel: true }); // denom exatamente 0
    expect(precoPorMargem(i, 77).inviavel).toBe(false);
  });
  it('taxas somando ≥ 100% tornam precoPorLucro inviável', () => {
    const i: PricingInputs = { ...base(0), comissaoPct: 60, impostoPct: 30, afiliadosPct: 15 };
    expect(somaTaxasPct(i)).toBeCloseTo(1.05, 6);
    expect(precoPorLucro(i, 10)).toEqual({ preco: 0, inviavel: true });
  });
});

describe('apurar — desconto e preço zero', () => {
  it('preço cheio é o promocional revertido pelo desconto', () => {
    expect(apurar(base(0), 88.45, 40).precoCheio).toBeCloseTo(88.45 / 0.6, 6);
  });
  it('sem desconto, preço cheio = preço', () => {
    expect(apurar(base(0), 88.45).precoCheio).toBe(88.45);
  });
  it('preço 0 → margem 0, sem divisão por zero', () => {
    const a = apurar(base(0), 0);
    expect(a.margemPct).toBe(0);
    expect(a.lucro).toBeLessThan(0);
  });
});

describe('apurarAnuncio — forma do anúncio salvo (comissão já em R$, tem antecipado)', () => {
  it('soma antecipado e custos adicionais na apuração', () => {
    const r = apurarAnuncio({
      valorVenda: 100,
      custo: 40,
      custosAdicionaisReais: 5,
      custoVar: 1,
      comissaoTaxaReais: 20,
      antecipado: 2,
      afiliadosPct: 0,
      impostoPct: 6,
    });
    // custoTotal = 40 + 5 + 1 + 20 + 2 + 0 + 6 = 74
    expect(r.custoTotal).toBeCloseTo(74, 6);
    expect(r.lucro).toBeCloseTo(26, 6);
    expect(r.margemPct).toBeCloseTo(26, 6);
  });
  it('valorVenda 0 → margem 0', () => {
    expect(apurarAnuncio({
      valorVenda: 0, custo: 10, custosAdicionaisReais: 0, custoVar: 0,
      comissaoTaxaReais: 0, antecipado: 0, afiliadosPct: 0, impostoPct: 0,
    }).margemPct).toBe(0);
  });
});
