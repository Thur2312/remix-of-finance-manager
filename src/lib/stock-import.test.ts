import { describe, it, expect } from 'vitest';
import { parseStockImport } from './stock-import';

describe('parseStockImport', () => {
  it('acha SKU e estoque por cabeçalho e monta as linhas', () => {
    const r = parseStockImport([
      { 'SKU do Produto': 'CAM-P', 'Nome do Produto': 'Camisa P', 'Estoque': 12 },
      { 'SKU do Produto': 'CAM-M', 'Nome do Produto': 'Camisa M', 'Estoque': '8' },
    ]);
    expect(r.colunaSku).toBe('SKU do Produto');
    expect(r.colunaEstoque).toBe('Estoque');
    expect(r.colunaNome).toBe('Nome do Produto');
    expect(r.rows).toEqual([
      { sku: 'CAM-P', itemName: 'Camisa P', stockUnits: 12 },
      { sku: 'CAM-M', itemName: 'Camisa M', stockUnits: 8 },
    ]);
  });

  it('casa cabeçalho com acento/caixa/variação', () => {
    const r = parseStockImport([{ 'SKU da Variação': 'X1', 'Quantidade em Estoque': 5 }]);
    expect(r.colunaSku).toBe('SKU da Variação');
    expect(r.colunaEstoque).toBe('Quantidade em Estoque');
    expect(r.rows[0]).toEqual({ sku: 'X1', itemName: null, stockUnits: 5 });
  });

  it('soma SKUs repetidos (uma linha por variação)', () => {
    const r = parseStockImport([
      { sku: 'A', estoque: 3 },
      { sku: 'A', estoque: 4 },
      { sku: 'B', estoque: 1 },
    ]);
    expect(r.rows.find((x) => x.sku === 'A')?.stockUnits).toBe(7);
    expect(r.rows.find((x) => x.sku === 'B')?.stockUnits).toBe(1);
  });

  it('descarta linha sem SKU ou sem estoque, e conta', () => {
    const r = parseStockImport([
      { sku: '', estoque: 5 },
      { sku: 'A', estoque: '' },
      { sku: 'B', estoque: 2 },
    ]);
    expect(r.semSku).toBe(1);
    expect(r.semEstoque).toBe(1);
    expect(r.rows).toEqual([{ sku: 'B', itemName: null, stockUnits: 2 }]);
  });

  it('estoque negativo vira 0; número com milhar/decimal br é lido', () => {
    const r = parseStockImport([
      { sku: 'A', estoque: -3 },
      { sku: 'B', estoque: '1.250' },
      { sku: 'C', estoque: '2,0' },
    ]);
    expect(r.rows.find((x) => x.sku === 'A')?.stockUnits).toBe(0);
    expect(r.rows.find((x) => x.sku === 'B')?.stockUnits).toBe(1250);
    expect(r.rows.find((x) => x.sku === 'C')?.stockUnits).toBe(2);
  });

  it('sem coluna reconhecível → rows vazio, colunas null, cabeçalhos preservados', () => {
    const r = parseStockImport([{ Foo: 1, Bar: 2 }]);
    expect(r.colunaSku).toBeNull();
    expect(r.colunaEstoque).toBeNull();
    expect(r.rows).toEqual([]);
    expect(r.colunasDetectadas).toEqual(['Foo', 'Bar']);
  });

  it('planilha vazia não quebra', () => {
    const r = parseStockImport([]);
    expect(r.rows).toEqual([]);
    expect(r.colunasDetectadas).toEqual([]);
  });
});
