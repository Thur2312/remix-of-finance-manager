// Parser da planilha de estoque (Aposta C — plano B do sync de catálogo).
// Recebe as linhas já lidas do XLSX/CSV (array de objetos header→valor) e
// encontra a coluna de SKU e a de estoque por correspondência flexível de
// cabeçalho — igual ao parser de repasse do TikTok. Puro e testável.
//
// A planilha da Shopee (Seller Center → exportar produtos) vem com uma linha
// por variação; o SKU fica na variação e o estoque também. SKUs repetidos são
// somados.

export interface StockImportRow {
  sku: string;
  itemName: string | null;
  stockUnits: number;
}

export interface StockImportResult {
  rows: StockImportRow[];
  /** cabeçalhos que a planilha tinha */
  colunasDetectadas: string[];
  /** cabeçalho usado como SKU / estoque / nome (null se não achou) */
  colunaSku: string | null;
  colunaEstoque: string | null;
  colunaNome: string | null;
  /** linhas descartadas */
  semSku: number;
  semEstoque: number;
}

const SKU_ALIASES = [
  'sku', 'sku id', 'sku do produto', 'sku da variacao', 'sku da variação',
  'variation sku', 'model sku', 'seller sku', 'sku do vendedor', 'codigo',
  'código', 'referencia', 'referência', 'cod', 'sku obrigatorio', 'sku (obrigatório)',
];
const ESTOQUE_ALIASES = [
  'estoque', 'stock', 'quantidade', 'quantity', 'qtd', 'saldo', 'available stock',
  'estoque disponivel', 'estoque disponível', 'quantidade em estoque',
  'current stock', 'seller stock', 'estoque do vendedor', 'available_quantity',
  'estoque total', 'total stock',
];
const NOME_ALIASES = [
  'nome do produto', 'product name', 'nome', 'item name', 'titulo', 'título',
  'name', 'nome do anuncio', 'nome do anúncio',
];

const norm = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function acharColuna(headers: string[], aliases: string[]): string | null {
  const normAliases = aliases.map(norm);
  // 1. match exato normalizado
  for (const h of headers) if (normAliases.includes(norm(h))) return h;
  // 2. cabeçalho contém um alias (ou vice-versa), com folga mínima
  for (const h of headers) {
    const nh = norm(h);
    for (const a of normAliases) {
      if (a.length >= 3 && (nh.includes(a) || a.includes(nh)) && nh.length >= 3) return h;
    }
  }
  return null;
}

function toInt(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v) : null;
  const s = String(v).replace(/[^\d\-.,]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export function parseStockImport(linhas: Record<string, unknown>[]): StockImportResult {
  const headers = linhas.length > 0 ? Object.keys(linhas[0]) : [];
  const colunaSku = acharColuna(headers, SKU_ALIASES);
  const colunaEstoque = acharColuna(headers, ESTOQUE_ALIASES);
  const colunaNome = acharColuna(headers, NOME_ALIASES);

  const base: StockImportResult = {
    rows: [], colunasDetectadas: headers, colunaSku, colunaEstoque, colunaNome,
    semSku: 0, semEstoque: 0,
  };
  if (!colunaSku || !colunaEstoque) return base;

  const porSku = new Map<string, StockImportRow>();
  for (const linha of linhas) {
    const sku = String(linha[colunaSku] ?? '').trim();
    if (!sku) { base.semSku++; continue; }
    const estoque = toInt(linha[colunaEstoque]);
    if (estoque == null) { base.semEstoque++; continue; }

    const nome = colunaNome ? String(linha[colunaNome] ?? '').trim() || null : null;
    const cur = porSku.get(sku);
    if (cur) {
      cur.stockUnits += Math.max(0, estoque);
      if (!cur.itemName && nome) cur.itemName = nome;
    } else {
      porSku.set(sku, { sku, itemName: nome, stockUnits: Math.max(0, estoque) });
    }
  }

  base.rows = [...porSku.values()];
  return base;
}
