import { useState, useEffect, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { create } from 'domain';


 const supabase = new SupabaseClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

/**
 * Interface que representa a estrutura de um Anúncio no banco de dados.
 * Agora inclui o campo 'user_id' para vincular o anúncio ao seu criador.
 */
export interface Anuncio {
  id: string;
  user_id: string;
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
  marketplace: string
}

/**
 * Tipo para entrada de dados ao criar um novo anúncio.
 * Omite campos gerados automaticamente e o user_id (que será injetado pelo hook).
 */
export type AnuncioInput = Omit<Anuncio, 'id' | 'user_id' | 'criado_em' | 'atualizado_em'>;

/**
 * Hook customizado para gerenciar operações CRUD na tabela 'anuncios' do Supabase.
 * Implementa isolamento de dados por usuário (Multi-tenancy).
 */
export function useAnuncios() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Busca apenas os anúncios pertencentes ao usuário autenticado.
   * O Supabase aplicará as políticas de RLS, mas é boa prática filtrar explicitamente.
   */
  const fetchAnuncios = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Obtém o usuário atual da sessão
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setAnuncios([]);
        return;
      }

      const { data, error } = await supabase
        .from('anuncios')
        .select('*')
        .eq('user_id', user.id) // Filtro explícito por segurança
        .order('criado_em', { ascending: false });

      if (error) {
        console.error('Erro Supabase (fetch):', error);
        toast.error(`Erro ao carregar seus anúncios: ${error.message}`);
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
   * Adiciona um novo anúncio vinculado ao usuário autenticado.
   */
  const addAnuncio = async (data: AnuncioInput): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Você precisa estar logado para cadastrar um produto.');
        return false;
      }

      // Injeta o user_id do usuário logado no objeto de dados
      const payload = {
        ...data,
        user_id: user.id
      };

      const { error } = await supabase.from('anuncios').insert([payload]);
      
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
   * Atualiza um anúncio existente, garantindo que pertença ao usuário.
   */
  const updateAnuncio = async (id: string, data: Partial<AnuncioInput>): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return false;

      const { error } = await supabase
        .from('anuncios')
        .update(data)
        .eq('id', id)
        .eq('user_id', user.id); // Garante que o usuário só edite o que é dele

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
   * Exclui um anúncio, garantindo que pertença ao usuário.
   */
  const deleteAnuncio = async (id: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return false;

      const { error } = await supabase
        .from('anuncios')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // Garante que o usuário só exclua o que é dele

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
