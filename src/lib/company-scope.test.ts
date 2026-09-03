import { describe, it, expect } from 'vitest';
import {
  companyIdForConnection, connectionsForCompany, companiesOnMarketplace,
  hasUnassignedConnection, type ScopedConnection,
} from './company-scope';

const conns: ScopedConnection[] = [
  { id: 's1', companyId: 'A', marketplace: 'shopee', label: 'Loja A Shopee' },
  { id: 's2', companyId: 'B', marketplace: 'shopee', label: 'Loja B Shopee' },
  { id: 'm1', companyId: 'A', marketplace: 'mercadolivre', label: 'ML A' },
  { id: 't1', companyId: null, marketplace: 'tiktok', label: 'TikTok (sem empresa)' },
];

describe('company-scope', () => {
  it('companyIdForConnection resolve o dono ou null', () => {
    expect(companyIdForConnection('s1', conns)).toBe('A');
    expect(companyIdForConnection('t1', conns)).toBeNull();
    expect(companyIdForConnection(null, conns)).toBeNull();
    expect(companyIdForConnection('inexistente', conns)).toBeNull();
  });

  it('connectionsForCompany filtra as lojas da empresa', () => {
    expect(connectionsForCompany('A', conns).map(c => c.id)).toEqual(['s1', 'm1']);
    expect(connectionsForCompany('B', conns).map(c => c.id)).toEqual(['s2']);
  });

  it('companiesOnMarketplace lista empresas distintas com loja na plataforma', () => {
    expect(companiesOnMarketplace('shopee', conns).sort()).toEqual(['A', 'B']);
    expect(companiesOnMarketplace('mercadolivre', conns)).toEqual(['A']);
    expect(companiesOnMarketplace('tiktok', conns)).toEqual([]); // t1 sem empresa
  });

  it('hasUnassignedConnection detecta loja órfã', () => {
    expect(hasUnassignedConnection(conns)).toBe(true);
    expect(hasUnassignedConnection(conns.filter(c => c.companyId))).toBe(false);
  });
});
