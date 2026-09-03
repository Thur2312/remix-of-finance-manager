// Chave canônica de SKU — fonte única.
//
// Normaliza agressivo: tira separadores e caixa. Casa "CAM-AZUL-P", "cam_azul_p"
// e "CAM AZUL P" no mesmo SKU (comum quando o vendedor redigita entre
// plataformas). Não casa strings de fato diferentes ("CAM" vs "CAMISA") — isso
// é mapa de alias (product_catalog.alias_of), Fase 2.
//
// Usado como chave de agregação por SKU em toda a app: reposição de estoque
// (src/hooks/useReplenishment.ts) e catálogo de produtos (src/lib/catalog.ts).
export const skuKey = (sku: string | null | undefined): string =>
  (sku ?? '').toLowerCase().replace(/[\s\-_./\\]+/g, '');
