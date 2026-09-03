import { describe, it, expect } from 'vitest';
import { allocateFixedCosts, type FixedCostScoped, type AllocationContext } from './cost-allocation';
import type { ScopedConnection } from './company-scope';

const conns: ScopedConnection[] = [
  { id: 's1', companyId: 'A', marketplace: 'shopee', label: 'A Shopee' },
  { id: 'm1', companyId: 'B', marketplace: 'mercadolivre', label: 'B ML' },
  { id: 's2', companyId: 'B', marketplace: 'shopee', label: 'B Shopee' },
];

const ctx = (over: Partial<AllocationContext> = {}): AllocationContext => ({
  companyIds: ['A', 'B'],
  connections: conns,
  revenueByCompanyCents: { A: 300_00, B: 100_00 }, // A fatura 3x B
  ...over,
});

const cost = (p: Partial<FixedCostScoped>): FixedCostScoped => ({
  id: p.id ?? 'c', name: p.name ?? 'x', amountCents: p.amountCents ?? 0,
  scope: p.scope ?? 'geral', companyId: p.companyId, integrationId: p.integrationId,
  marketplace: p.marketplace, allocationPct: p.allocationPct,
});

describe('allocateFixedCosts', () => {
  it('scope empresa → 100% na empresa vinculada', () => {
    const r = allocateFixedCosts([cost({ scope: 'empresa', companyId: 'A', amountCents: 500_00 })], ctx());
    expect(r.byCompany.A.exclusivoCents).toBe(500_00);
    expect(r.byCompany.B.exclusivoCents).toBe(0);
    expect(r.byCompany.A.totalCents).toBe(500_00);
  });

  it('scope loja → na empresa dona da conexão', () => {
    const r = allocateFixedCosts([cost({ scope: 'loja', integrationId: 'm1', amountCents: 200_00 })], ctx());
    expect(r.byCompany.B.lojaCents).toBe(200_00);
    expect(r.byCompany.A.lojaCents).toBe(0);
  });

  it('scope geral → rateado proporcional ao faturamento (A 3x B)', () => {
    const r = allocateFixedCosts([cost({ scope: 'geral', amountCents: 400_00 })], ctx());
    expect(r.byCompany.A.rateioGeralCents).toBe(300_00); // 3/4
    expect(r.byCompany.B.rateioGeralCents).toBe(100_00); // 1/4
    expect(r.totalCents).toBe(400_00);
  });

  it('rateio geral não perde centavo (resto vai pro maior peso)', () => {
    const r = allocateFixedCosts([cost({ scope: 'geral', amountCents: 100_01 })], ctx());
    expect(r.byCompany.A.rateioGeralCents + r.byCompany.B.rateioGeralCents).toBe(100_01);
  });

  it('scope plataforma → só entre empresas com loja naquela plataforma', () => {
    // shopee: A e B. ml: só B.
    const r = allocateFixedCosts([
      cost({ id: 'ads-shopee', scope: 'plataforma', marketplace: 'shopee', amountCents: 400_00 }),
      cost({ id: 'ads-ml', scope: 'plataforma', marketplace: 'mercadolivre', amountCents: 90_00 }),
    ], ctx());
    // shopee 400 rateado A:B por faturamento 3:1 → 300 / 100
    expect(r.byCompany.A.plataformaCents).toBe(300_00);
    expect(r.byCompany.B.plataformaCents).toBe(100_00 + 90_00); // + ml inteiro
  });

  it('geral sem faturamento em ninguém → vai pro bucket não atribuído', () => {
    const r = allocateFixedCosts(
      [cost({ scope: 'geral', amountCents: 150_00 })],
      ctx({ revenueByCompanyCents: {} }),
    );
    expect(r.naoAtribuido.geralSemFaturamentoCents).toBe(150_00);
    expect(r.byCompany.A.totalCents).toBe(0);
    expect(r.totalCents).toBe(150_00);
  });

  it('loja de conexão não atribuída → bucket não atribuído', () => {
    const orphan: ScopedConnection[] = [...conns, { id: 'x9', companyId: null, marketplace: 'tiktok', label: 'órfã' }];
    const r = allocateFixedCosts(
      [cost({ scope: 'loja', integrationId: 'x9', amountCents: 50_00 })],
      ctx({ connections: orphan }),
    );
    expect(r.naoAtribuido.lojaSemEmpresaCents).toBe(50_00);
  });

  it('empresa removida (companyId fora da lista) → não atribuído', () => {
    const r = allocateFixedCosts([cost({ scope: 'empresa', companyId: 'ZZZ', amountCents: 10_00 })], ctx());
    expect(r.naoAtribuido.totalCents).toBe(10_00);
  });

  it('geral com allocationPct → usa o split manual em vez do faturamento', () => {
    // faturamento é A 3:1 B, mas o manual diz 40/60
    const r = allocateFixedCosts(
      [cost({ scope: 'geral', amountCents: 100_00, allocationPct: { A: 40, B: 60 } })],
      ctx(),
    );
    expect(r.byCompany.A.rateioGeralCents).toBe(40_00);
    expect(r.byCompany.B.rateioGeralCents).toBe(60_00);
    expect(r.totalCents).toBe(100_00);
  });

  it('allocationPct com empresa desconhecida → a fatia dela vai pro não atribuído', () => {
    const r = allocateFixedCosts(
      [cost({ scope: 'geral', amountCents: 100_00, allocationPct: { A: 50, GONE: 50 } })],
      ctx(),
    );
    expect(r.byCompany.A.rateioGeralCents).toBe(50_00);
    expect(r.naoAtribuido.geralSemFaturamentoCents).toBe(50_00);
    expect(r.totalCents).toBe(100_00);
  });

  it('allocationPct vazio/zerado → cai no rateio automático por faturamento', () => {
    const r = allocateFixedCosts(
      [cost({ scope: 'geral', amountCents: 400_00, allocationPct: { A: 0, B: 0 } })],
      ctx(),
    );
    expect(r.byCompany.A.rateioGeralCents).toBe(300_00);
    expect(r.byCompany.B.rateioGeralCents).toBe(100_00);
  });

  it('plataforma com allocationPct → split manual, ignora faturamento e marketplace', () => {
    const r = allocateFixedCosts(
      [cost({ scope: 'plataforma', marketplace: 'shopee', amountCents: 200_00, allocationPct: { A: 25, B: 75 } })],
      ctx(),
    );
    expect(r.byCompany.A.plataformaCents).toBe(50_00);
    expect(r.byCompany.B.plataformaCents).toBe(150_00);
  });

  it('allocationPct que não soma 100 é normalizado pelo total', () => {
    const r = allocateFixedCosts(
      [cost({ scope: 'geral', amountCents: 90_00, allocationPct: { A: 1, B: 2 } })],
      ctx(),
    );
    expect(r.byCompany.A.rateioGeralCents).toBe(30_00);
    expect(r.byCompany.B.rateioGeralCents).toBe(60_00);
  });

  it('total sempre bate: Σ byCompany + naoAtribuido = Σ custos', () => {
    const costs = [
      cost({ id: '1', scope: 'geral', amountCents: 400_00 }),
      cost({ id: '2', scope: 'empresa', companyId: 'A', amountCents: 120_00 }),
      cost({ id: '3', scope: 'loja', integrationId: 's1', amountCents: 80_00 }),
      cost({ id: '4', scope: 'plataforma', marketplace: 'shopee', amountCents: 60_00 }),
      cost({ id: '5', scope: 'empresa', companyId: 'GONE', amountCents: 40_00 }),
    ];
    const r = allocateFixedCosts(costs, ctx());
    const somaEmpresas = Object.values(r.byCompany).reduce((s, a) => s + a.totalCents, 0);
    expect(somaEmpresas + r.naoAtribuido.totalCents).toBe(700_00);
    expect(r.totalCents).toBe(700_00);
  });
});
