export interface MedidaLinha {
  id: string;
  tamanho: string;
  valores: Record<string, string>;
}

export const medidasDisponiveis = [
  'Busto',
  'Cintura',
  'Quadril',
  'Comprimento',
  'Manga',
  'Ombro',
];
