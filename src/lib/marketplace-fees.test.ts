import { describe, it, expect } from 'vitest';
import {
  getShopeeRates,
  getTiktokRates,
  getMercadoLivreRates,
  getMercadoLivreTaxaFixa,
  calcComissaoTaxaReais,
  isAutoMarketplace,
} from './marketplace-fees';

describe('getShopeeRates', () => {
  it('faixa até R$79,99: 20% + R$4', () => {
    expect(getShopeeRates(0)).toEqual({ comissao: 20, taxaFixa: 4 });
    expect(getShopeeRates(79.99)).toEqual({ comissao: 20, taxaFixa: 4 });
  });
  it('faixa R$80–99,99: 14% + R$16', () => {
    expect(getShopeeRates(80)).toEqual({ comissao: 14, taxaFixa: 16 });
    expect(getShopeeRates(99.99)).toEqual({ comissao: 14, taxaFixa: 16 });
  });
  it('faixa R$100–199,99: 14% + R$20', () => {
    expect(getShopeeRates(100)).toEqual({ comissao: 14, taxaFixa: 20 });
    expect(getShopeeRates(199.99)).toEqual({ comissao: 14, taxaFixa: 20 });
  });
  it('acima de R$200: 14% + R$26 (constante)', () => {
    expect(getShopeeRates(200)).toEqual({ comissao: 14, taxaFixa: 26 });
    expect(getShopeeRates(5000)).toEqual({ comissao: 14, taxaFixa: 26 });
  });
});

describe('getTiktokRates', () => {
  it('abaixo de R$50: 10% + R$4', () => {
    expect(getTiktokRates(49.99)).toEqual({ comissao: 10, taxaFixa: 4 });
  });
  it('a partir de R$50: 6% + R$6', () => {
    expect(getTiktokRates(50)).toEqual({ comissao: 6, taxaFixa: 6 });
    expect(getTiktokRates(300)).toEqual({ comissao: 6, taxaFixa: 6 });
  });
});

describe('getMercadoLivreTaxaFixa', () => {
  it('escala por faixa abaixo de R$79', () => {
    expect(getMercadoLivreTaxaFixa(29.99)).toBe(5.5);
    expect(getMercadoLivreTaxaFixa(30)).toBe(6.5);
    expect(getMercadoLivreTaxaFixa(49.99)).toBe(6.5);
    expect(getMercadoLivreTaxaFixa(50)).toBe(8);
    expect(getMercadoLivreTaxaFixa(64.99)).toBe(8);
    expect(getMercadoLivreTaxaFixa(65)).toBe(10);
    expect(getMercadoLivreTaxaFixa(78.99)).toBe(10);
  });
  it('sem taxa fixa a partir de R$79 ou preço não-positivo', () => {
    expect(getMercadoLivreTaxaFixa(79)).toBe(0);
    expect(getMercadoLivreTaxaFixa(150)).toBe(0);
    expect(getMercadoLivreTaxaFixa(0)).toBe(0);
    expect(getMercadoLivreTaxaFixa(-5)).toBe(0);
  });
});

describe('getMercadoLivreRates', () => {
  it('comissão por tipo de anúncio', () => {
    expect(getMercadoLivreRates(40, 'classico')).toEqual({ comissao: 12, taxaFixa: 6.5 });
    expect(getMercadoLivreRates(40, 'premium')).toEqual({ comissao: 17, taxaFixa: 6.5 });
  });
});

describe('calcComissaoTaxaReais', () => {
  it('Shopee: comissão % sobre o preço + taxa fixa da faixa', () => {
    // R$88,45 → faixa 14% + R$16 → 12,383 + 16
    expect(calcComissaoTaxaReais('Shopee', 88.45)).toBeCloseTo(88.45 * 0.14 + 16, 6);
  });
  it('TikTok ≥ R$50: 6% + R$6', () => {
    expect(calcComissaoTaxaReais('TiktokShop', 88.45)).toBeCloseTo(88.45 * 0.06 + 6, 6);
  });
  it('Mercado Livre premium abaixo de R$79 inclui taxa fixa', () => {
    expect(calcComissaoTaxaReais('MercadoLivre', 60, 'premium')).toBeCloseTo(60 * 0.17 + 8, 6);
  });
  it('preço não-positivo ou marketplace vazio → 0', () => {
    expect(calcComissaoTaxaReais('Shopee', 0)).toBe(0);
    expect(calcComissaoTaxaReais('', 100)).toBe(0);
  });
});

describe('isAutoMarketplace', () => {
  it('distingue marketplaces com auto-preenchimento', () => {
    expect(isAutoMarketplace('Shopee')).toBe(true);
    expect(isAutoMarketplace('TiktokShop')).toBe(true);
    expect(isAutoMarketplace('MercadoLivre')).toBe(true);
    expect(isAutoMarketplace('')).toBe(false);
  });
});
