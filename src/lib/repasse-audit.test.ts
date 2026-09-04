import { describe, it, expect } from 'vitest';
import { auditShopeeRepasses, type AuditOrderLike, type AuditFeeLike, type AuditPaymentLike } from './repasse-audit';

const HOJE = '2026-09-10T12:00:00Z';

const order = (o: Partial<AuditOrderLike> & { id: string }): AuditOrderLike => ({
  external_order_id: o.id,
  status: 'COMPLETED',
  total_amount: 100,
  order_updated_at: HOJE,
  ...o,
});
const fee = (order_id: string, fee_type: string, amount: number): AuditFeeLike => ({ order_id, fee_type, amount });
const escrow = (order_id: string, net_amount = 60): AuditPaymentLike => ({ order_id, payment_method: 'escrow', net_amount });

describe('auditShopeeRepasses — taxa acima da tabela', () => {
  it('cobrança bem acima da tabela (100 → esperado 34) vira issue com a diferença certa', () => {
    const r = auditShopeeRepasses(
      [order({ id: 'a', total_amount: 100 })],
      [fee('a', 'commission', 40), fee('a', 'service_fee', 5)], // cobrado = 45
      [],
      { hojeIso: HOJE },
    );
    const issue = r.issues.find(i => i.type === 'taxa_acima_tabela');
    expect(issue).toMatchObject({ orderId: 'a', taxaCobrada: 45, taxaEsperada: 34, diferenca: 11 });
    expect(r.pedidosComTaxaAcima).toBe(1);
    expect(r.totalDivergenciaTaxa).toBeCloseTo(11, 5);
  });

  it('diferença dentro da tolerância (8% ou R$2, o que for maior) não vira issue', () => {
    const r = auditShopeeRepasses(
      [order({ id: 'a', total_amount: 100 })],
      [fee('a', 'commission', 34), fee('a', 'service_fee', 2)], // cobrado = 36, diferença = 2, limite = max(2, 34*0.08=2.72)
      [],
      { hojeIso: HOJE },
    );
    expect(r.issues.filter(i => i.type === 'taxa_acima_tabela')).toEqual([]);
  });

  it('cobrado abaixo da tabela não vira issue (não perde dinheiro)', () => {
    const r = auditShopeeRepasses(
      [order({ id: 'a', total_amount: 100 })],
      [fee('a', 'commission', 20)],
      [],
      { hojeIso: HOJE },
    );
    expect(r.issues).toEqual([]);
  });

  it('pedido sem nenhuma fee registrada não entra na comparação (não é "cobrou errado", é "não sincronizou")', () => {
    const r = auditShopeeRepasses([order({ id: 'a', total_amount: 100 })], [], [], { hojeIso: HOJE });
    expect(r.issues.filter(i => i.type === 'taxa_acima_tabela')).toEqual([]);
  });

  it('frete e desconto não entram na taxa auditada, mesmo em cima da tabela', () => {
    const r = auditShopeeRepasses(
      [order({ id: 'a', total_amount: 100 })],
      [fee('a', 'commission', 14), fee('a', 'service_fee', 20), fee('a', 'shipping_fee', 999), fee('a', 'seller_discount', 50)],
      [],
      { hojeIso: HOJE },
    );
    // commission(14) + service_fee(20) = 34 = exatamente o esperado → sem issue
    expect(r.issues).toEqual([]);
  });

  it('respeita toleranciaPct/toleranciaMinReais customizados', () => {
    const r = auditShopeeRepasses(
      [order({ id: 'a', total_amount: 100 })],
      [fee('a', 'commission', 35)], // diferença de 1 sobre esperado 34
      [],
      { hojeIso: HOJE, toleranciaMinReais: 0.5, toleranciaPct: 0 },
    );
    expect(r.pedidosComTaxaAcima).toBe(1);
  });
});

describe('auditShopeeRepasses — repasse atrasado', () => {
  it('concluído há mais que o prazo, sem nenhum escrow → issue', () => {
    const r = auditShopeeRepasses(
      [order({ id: 'a', order_updated_at: '2026-08-15T00:00:00Z' })], // 26 dias antes de HOJE
      [],
      [],
      { hojeIso: HOJE, diasAtrasoRepasse: 20 },
    );
    const issue = r.issues.find(i => i.type === 'sem_repasse_atrasado');
    expect(issue).toMatchObject({ orderId: 'a', diasSemRepasse: 26 });
    expect(r.pedidosSemRepasseAtrasado).toBe(1);
    expect(r.totalSemRepasseAtrasado).toBe(100);
  });

  it('dentro do prazo → sem issue', () => {
    const r = auditShopeeRepasses(
      [order({ id: 'a', order_updated_at: '2026-09-01T00:00:00Z' })], // 9 dias
      [], [],
      { hojeIso: HOJE, diasAtrasoRepasse: 20 },
    );
    expect(r.issues.filter(i => i.type === 'sem_repasse_atrasado')).toEqual([]);
  });

  it('com escrow, mesmo muito antigo, nunca vira issue de atraso', () => {
    const r = auditShopeeRepasses(
      [order({ id: 'a', order_updated_at: '2026-01-01T00:00:00Z' })],
      [],
      [escrow('a')],
      { hojeIso: HOJE, diasAtrasoRepasse: 20 },
    );
    expect(r.issues.filter(i => i.type === 'sem_repasse_atrasado')).toEqual([]);
  });
});

describe('auditShopeeRepasses — recorte geral', () => {
  it('ignora pedido não concluído', () => {
    const r = auditShopeeRepasses(
      [order({ id: 'a', status: 'CANCELLED', order_updated_at: '2026-01-01T00:00:00Z' })],
      [fee('a', 'commission', 999)],
      [],
      { hojeIso: HOJE },
    );
    expect(r.pedidosAnalisados).toBe(0);
    expect(r.issues).toEqual([]);
  });

  it('ignora pedido com total_amount <= 0', () => {
    const r = auditShopeeRepasses([order({ id: 'a', total_amount: 0 })], [], [], { hojeIso: HOJE });
    expect(r.pedidosAnalisados).toBe(0);
  });

  it('um pedido pode acumular as duas issues ao mesmo tempo', () => {
    const r = auditShopeeRepasses(
      [order({ id: 'a', total_amount: 100, order_updated_at: '2026-08-01T00:00:00Z' })],
      [fee('a', 'commission', 50)],
      [],
      { hojeIso: HOJE, diasAtrasoRepasse: 20 },
    );
    expect(r.issues).toHaveLength(2);
    expect(r.issues.map(i => i.type).sort()).toEqual(['sem_repasse_atrasado', 'taxa_acima_tabela']);
  });

  it('ordena por maior impacto financeiro primeiro', () => {
    const r = auditShopeeRepasses(
      [
        order({ id: 'pequeno', total_amount: 100 }),
        order({ id: 'grande', total_amount: 100 }),
      ],
      [fee('pequeno', 'commission', 40), fee('grande', 'commission', 80)],
      [],
      { hojeIso: HOJE },
    );
    expect(r.issues[0].orderId).toBe('grande');
  });

  it('pedidosAnalisados conta só os concluídos com valor > 0, independente de ter issue', () => {
    const r = auditShopeeRepasses(
      [order({ id: 'a' }), order({ id: 'b' }), order({ id: 'c', status: 'CANCELLED' })],
      [], [escrow('a'), escrow('b')],
      { hojeIso: HOJE },
    );
    expect(r.pedidosAnalisados).toBe(2);
  });
});
