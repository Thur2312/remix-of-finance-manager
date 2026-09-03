import { describe, it, expect } from 'vitest';
import { simulatePrice, priceCurve, projectVolume, type PriceScenarioBaseline } from './scenario';

const base = (p: Partial<PriceScenarioBaseline> = {}): PriceScenarioBaseline => ({
  nome: 'Produto',
  marketplace: 'Shopee',
  custo: 30,
  custoVar: 1,
  impostoPct: 6,
  afiliadosPct: 0,
  precoAtual: 90,
  unidadesMes: 40,
  ...p,
});

describe('simulatePrice', () => {
  it('preço igual ao atual → simulado == baseline, delta zero', () => {
    const s = simulatePrice(base(), 90);
    expect(s.simulado.lucroUnit).toBe(s.baseline.lucroUnit);
    expect(s.simulado.deltaLucroVolumeConstante).toBe(0);
    expect(s.simulado.deltaVolumePct).toBe(0);
  });

  it('baixar o preço → lucro/un cai e o break-even exige mais volume', () => {
    const s = simulatePrice(base({ precoAtual: 90 }), 80);
    expect(s.simulado.lucroUnit).toBeLessThan(s.baseline.lucroUnit);
    expect(s.simulado.volumeBreakEven!).toBeGreaterThan(base().unidadesMes);
    expect(s.simulado.deltaVolumePct!).toBeGreaterThan(0);
    expect(s.simulado.deltaLucroVolumeConstante).toBeLessThan(0);
  });

  it('a comissão muda de faixa ao cruzar R$99,99 (Shopee)', () => {
    // no atual R$90 a comissão Shopee é 14%; subindo pra R$79 vira 20%
    const s = simulatePrice(base({ precoAtual: 90 }), 79);
    expect(s.baseline.comissaoPct).toBe(14);
    expect(s.simulado.comissaoPct).toBe(20);
  });

  it('preço que zera o lucro unitário → inviável, sem break-even', () => {
    // custo alto o suficiente pra que nenhum volume salve
    const s = simulatePrice(base({ custo: 200, precoAtual: 90 }), 90);
    expect(s.simulado.viavel).toBe(false);
    expect(s.simulado.volumeBreakEven).toBeNull();
    expect(s.veredito).toBe('inviavel');
  });

  it('subir o preço a volume constante → veredito "melhora"', () => {
    const s = simulatePrice(base({ precoAtual: 90 }), 110);
    expect(s.simulado.deltaLucroVolumeConstante).toBeGreaterThan(0);
    expect(s.veredito).toBe('melhora');
  });

  it('corte pequeno de preço → "plausível"; corte grande → "difícil"', () => {
    const pequeno = simulatePrice(base({ precoAtual: 90, custo: 20 }), 87);
    const grande = simulatePrice(base({ precoAtual: 90, custo: 20 }), 62);
    expect(pequeno.veredito).toBe('plausivel');
    expect(grande.veredito).toBe('dificil');
  });

  it('marketplace vazio usa comissão/taxa manual', () => {
    const s = simulatePrice(base({ marketplace: '', comissaoPctManual: 10, taxaFixaManual: 2 }), 90);
    expect(s.simulado.comissaoPct).toBe(10);
    expect(s.simulado.taxaFixa).toBe(2);
  });

  // ── Item 15: despesas ligadas à venda ──────────────────────────────────────
  it('frete subsidiado + cupom (R$ fixos) baixam o lucro/un no mesmo valor', () => {
    const sem = simulatePrice(base(), 90);
    const com = simulatePrice(base({ freteSubsidiadoPorVenda: 3, cupomPorVenda: 2 }), 90);
    expect(com.simulado.lucroUnit).toBeCloseTo(sem.simulado.lucroUnit - 5, 5);
    expect(com.simulado.extrasVendaReais).toBe(5);
  });

  it('mídia (% da receita) escala com o preço', () => {
    const s = simulatePrice(base({ midiaPct: 10 }), 100);
    // 10% de 100 = 10 de mídia no preço simulado
    expect(s.simulado.extrasVendaReais).toBe(10);
    const semMidia = simulatePrice(base(), 100);
    expect(s.simulado.lucroUnit).toBeCloseTo(semMidia.simulado.lucroUnit - 10, 5);
  });

  it('extras pesados podem virar o cenário inviável', () => {
    const s = simulatePrice(base({ custo: 55, freteSubsidiadoPorVenda: 20, midiaPct: 15 }), 90);
    expect(s.simulado.viavel).toBe(false);
    expect(s.veredito).toBe('inviavel');
  });

  it('sem os campos novos, o resultado é idêntico ao de antes (extrasVendaReais = 0)', () => {
    const s = simulatePrice(base(), 90);
    expect(s.simulado.extrasVendaReais).toBe(0);
    expect(s.simulado.lucroUnit).toBe(s.baseline.lucroUnit);
  });
});

describe('priceCurve', () => {
  it('devolve steps+1 pontos, preços crescentes, dentro da faixa', () => {
    const c = priceCurve(base({ precoAtual: 100 }), { steps: 10 });
    expect(c).toHaveLength(11);
    expect(c[0].preco).toBeCloseTo(70, 0);
    expect(c[10].preco).toBeCloseTo(135, 0);
    for (let i = 1; i < c.length; i++) expect(c[i].preco).toBeGreaterThan(c[i - 1].preco);
  });

  it('a volume constante o lucro sobe com o preço no geral (ponta > início)', () => {
    const c = priceCurve(base({ precoAtual: 90, custo: 30 }), { steps: 40 });
    expect(c[c.length - 1].lucroMes).toBeGreaterThan(c[0].lucroMes);
  });

  it('tem uma queda local ao cruzar a faixa da Shopee (R$79,99 → R$80: taxa fixa 4 → 16)', () => {
    // range 63–121,5 cruza o limite de R$80
    const c = priceCurve(base({ precoAtual: 90, custo: 30 }), { steps: 80 });
    const temQueda = c.some((p, i) => i > 0 && p.lucroMes < c[i - 1].lucroMes);
    expect(temQueda).toBe(true);
  });
});

describe('projectVolume', () => {
  it('volume acima do break-even → lucro maior que hoje e cobreBreakEven true', () => {
    const s = simulatePrice(base({ precoAtual: 90, custo: 20 }), 80);
    const be = s.simulado.volumeBreakEven!;
    const p = projectVolume(base({ precoAtual: 90, custo: 20 }), 80, be + 10);
    expect(p.cobreBreakEven).toBe(true);
    expect(p.deltaVsHoje).toBeGreaterThan(0);
  });

  it('volume abaixo do break-even → lucro menor que hoje', () => {
    const p = projectVolume(base({ precoAtual: 90, custo: 20, unidadesMes: 40 }), 80, 45);
    // 45 provavelmente < break-even de um corte de preço
    expect(p.cobreBreakEven).toBe(false);
    expect(p.deltaVsHoje).toBeLessThan(0);
  });

  it('mesmo preço, mesmo volume → delta zero', () => {
    const p = projectVolume(base({ unidadesMes: 40 }), base().precoAtual, 40);
    expect(p.deltaVsHoje).toBe(0);
  });
});
