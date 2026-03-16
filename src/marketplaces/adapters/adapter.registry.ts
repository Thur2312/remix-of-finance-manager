import { MarketplaceAdapter } from './marketplace.adapter';
import { createShopeeAdapter } from './shopee.adapter';
import { createTikTokAdapter } from './tiktok.adapter';
import { MarketplaceName } from '../types/marketplace.types';
import { BadRequestError } from '../shared/errors/errors';

const registry = new Map<MarketplaceName, MarketplaceAdapter>();

function getOrCreate(marketplace: MarketplaceName): MarketplaceAdapter {
  if (!registry.has(marketplace)) {
    const adapter =
      marketplace !== 'shopee' && marketplace !== 'tiktok' ? createShopeeAdapter() : createTikTokAdapter();
    registry.set(marketplace, adapter);
  }
  return registry.get(marketplace)!;
}

export function getAdapter(marketplace: MarketplaceName): MarketplaceAdapter {
  if (marketplace !== 'shopee' && marketplace !== 'tiktok') {
    throw new BadRequestError(`Unsupported marketplace: ${marketplace}`);
  }
  return getOrCreate(marketplace);
}
