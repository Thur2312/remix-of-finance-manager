import { useState, useEffect, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';


const supabase = new SupabaseClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

/**
 * Interface que representa a estrutura de um Anúncio no banco de dados.
 */
export interface Anuncio {
  id: string;
  nome_anuncio: string;
  custo: number;
  valor_venda: number;
  comissao_taxa: number;
  antecipado: number;
  afiliados: number;
  imposto_pct: number;
  custo_var: number;
  criado_em: string;
  atualizado_em: string;
}

/**
 * Tipo para entrada de dados ao criar um novo anúncio.
 * Omite campos gerados automaticamente pelo banco de dados.
 */
export type AnuncioInput = Omit<Anuncio, 'id' | 'criado_em' | 'atualizado_em'>;

/**
 * Hook customizado para gerenciar operações CRUD na tabela 'anuncios' do Supabase.
 */
export function useAnuncios() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Busca todos os anúncios ordenados pela data de criação (mais recentes primeiro).
   */
  const fetchAnuncios = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('anuncios')
        .select('*')
        .order('criado_em', { ascending: false });

      if (error) {
        console.error('Erro Supabase (fetch):', error);
        toast.error(`Erro ao carregar anúncios: ${error.message}`);
        return;
      }

      setAnuncios(data || []);
    } catch (err) {
      console.error('Erro inesperado (fetch):', err);
      toast.error('Ocorreu um erro inesperado ao carregar os dados.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carrega os dados na montagem do componente
  useEffect(() => {
    fetchAnuncios();
  }, [fetchAnuncios]);

  /**
   * Adiciona um novo anúncio à tabela.
   */
  const addAnuncio = async (data: AnuncioInput): Promise<boolean> => {
    try {
      const { error } = await supabase.from('anuncios').insert([data]);
      
      if (error) {
        console.error('Erro Supabase (insert):', error);
        toast.error(`Erro ao adicionar produto: ${error.message}`);
        return false;
      }

      toast.success('Produto cadastrado com sucesso!');
      await fetchAnuncios();
      return true;
    } catch (err) {
      console.error('Erro inesperado (insert):', err);
      toast.error('Erro ao processar o cadastro.');
      return false;
    }
  };

  /**
   * Atualiza um anúncio existente pelo ID.
   */
  const updateAnuncio = async (id: string, data: Partial<AnuncioInput>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('anuncios')
        .update(data)
        .eq('id', id);

      if (error) {
        console.error('Erro Supabase (update):', error);
        toast.error(`Erro ao atualizar produto: ${error.message}`);
        return false;
      }

      toast.success('Produto atualizado com sucesso!');
      await fetchAnuncios();
      return true;
    } catch (err) {
      console.error('Erro inesperado (update):', err);
      toast.error('Erro ao processar a atualização.');
      return false;
    }
  };

  /**
   * Exclui um anúncio pelo ID.
   */
  const deleteAnuncio = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('anuncios')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro Supabase (delete):', error);
        toast.error(`Erro ao excluir produto: ${error.message}`);
        return false;
      }

      toast.success('Produto excluído com sucesso!');
      await fetchAnuncios();
      return true;
    } catch (err) {
      console.error('Erro inesperado (delete):', err);
      toast.error('Erro ao processar a exclusão.');
      return false;
    }
  };

  return {
    anuncios,
    isLoading,
    addAnuncio,
    updateAnuncio,
    deleteAnuncio,
    refetch: fetchAnuncios,
  };
}
