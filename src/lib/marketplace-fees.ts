// Tabelas de comissão + taxa fixa por marketplace, por faixa de preço de venda.
//
// As faixas abaixo são conferidas manualmente na Central do Vendedor de cada
// plataforma. Os marketplaces mudam essas faixas sem aviso — a data de
// verificação precisa ficar visível na tela pra o usuário saber se o valor
// calculado ainda reflete a taxa real (BUG-08 do docs/DIAGNOSTICO-FINANCEIRO.md).
//
// Módulo puro: sem React, sem Supabase. Único ponto de verdade das taxas de
// marketplace da Calculadora — se um dia TikTok/ML precisarem do mesmo cálculo
// (como Shopee já tem em shopee-sync-status.ts), consomem daqui.

export const TAXAS_VERIFICADAS_EM = '26/08/2026';

export type Marketplace = 'Shopee' | 'TiktokShop' | 'MercadoLivre';
export type MLTipoAnuncio = 'classico' | 'premium';

export interface MarketplaceRate {
  /** comissão em % sobre o valor da venda */
  comissao: number;
  /** taxa fixa em R$ por venda/item */
  taxaFixa: number;
}

// ─── Shopee ──────────────────────────────────────────────────────────────────
// Faixa vigente em TAXAS_VERIFICADAS_EM. Acima de R$100 a comissão e a taxa
// fixa são as mesmas para qualquer preço.
export function getShopeeRates(preco: number): MarketplaceRate {
  if (preco <= 79.99) return { comissao: 20, taxaFixa: 4 };
  if (preco <= 99.99) return { comissao: 14, taxaFixa: 16 };
  if (preco <= 199.99) return { comissao: 14, taxaFixa: 20 };
  return { comissao: 14, taxaFixa: 26 };
}

// ─── TikTok Shop ─────────────────────────────────────────────────────────────
//   < R$50:  comissão 10% + taxa fixa R$4,00 por item
//   ≥ R$50:  comissão  6% + taxa fixa R$6,00 por item
// O tier é decidido pelo preço de venda (promocional). Pode variar em
// campanhas/promoções — confirmar na Central do Vendedor.
export function getTiktokRates(preco: number): MarketplaceRate {
  if (preco < 50) return { comissao: 10, taxaFixa: 4 };
  return { comissao: 6, taxaFixa: 6 };
}

// ─── Mercado Livre ───────────────────────────────────────────────────────────
// O tipo de anúncio define a comissão (a real varia por categoria — usamos a
// média típica):
//   Clássico (Simples): ~12% (faixa 10%–14%)
//   Premium:            ~17% (faixa 15%–19%)
export const ML_COMISSAO: Record<MLTipoAnuncio, number> = { classico: 12, premium: 17 };

// Taxa fixa por unidade: cobrada apenas em produtos abaixo de R$79. O valor
// escala conforme o preço do anúncio (faixa R$5,50 a R$10,00); a partir de R$79
// não há taxa fixa (frete grátis obrigatório).
export function getMercadoLivreTaxaFixa(preco: number): number {
  if (preco <= 0 || preco >= 79) return 0;
  if (preco < 30) return 5.5;
  if (preco < 50) return 6.5;
  if (preco < 65) return 8;
  return 10; // R$65 a R$78,99
}

export function getMercadoLivreRates(preco: number, tipo: MLTipoAnuncio): MarketplaceRate {
  return { comissao: ML_COMISSAO[tipo], taxaFixa: getMercadoLivreTaxaFixa(preco) };
}

// ─── Comissão + taxa fixa em R$, resolvida por marketplace ────────────────────
export function calcComissaoTaxaReais(
  marketplace: Marketplace | '',
  preco: number,
  mlTipo: MLTipoAnuncio = 'classico',
): number {
  if (preco <= 0) return 0;
  const rate =
    marketplace === 'Shopee' ? getShopeeRates(preco) :
    marketplace === 'TiktokShop' ? getTiktokRates(preco) :
    marketplace === 'MercadoLivre' ? getMercadoLivreRates(preco, mlTipo) :
    null;
  if (!rate) return 0;
  return preco * (rate.comissao / 100) + rate.taxaFixa;
}

// Marketplaces que preenchem comissão/taxa automaticamente na Calculadora.
export const AUTO_MARKETPLACES: Marketplace[] = ['Shopee', 'TiktokShop', 'MercadoLivre'];
export const isAutoMarketplace = (m: Marketplace | ''): m is Marketplace =>
  AUTO_MARKETPLACES.includes(m as Marketplace);
