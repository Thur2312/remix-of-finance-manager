import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';

/**
 * Interface que representa a estrutura de um Anúncio no banco de dados.
 * Agora inclui o campo 'company_id' para múltiplas empresas.
 */
export interface Anuncio {
  id: string;
  user_id: string;
  company_id: string;
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
 * Omite campos gerados automaticamente e o company_id (que será injetado pelo hook).
 */
export type AnuncioInput = Omit<Anuncio, 'id' | 'user_id' | 'company_id' | 'criado_em' | 'atualizado_em'>;

/**
 * Hook customizado para gerenciar operações CRUD na tabela 'anuncios' do Supabase.
 * Implementa isolamento de dados por empresa (Multi-tenancy).
 */
export function useAnuncios() {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Busca apenas os anúncios pertencentes à empresa atual.
   */
  const fetchAnuncios = useCallback(async () => {
    if (!user || !currentCompany?.id) {
      setAnuncios([]);
      return;
    }

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('anuncios')
        .select('*')
        .eq('company_id', currentCompany.id)
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
  }, [user, currentCompany?.id]);

  // Carrega os dados na montagem do componente
  useEffect(() => {
    fetchAnuncios();
  }, [fetchAnuncios]);

  /**
   * Adiciona um novo anúncio vinculado à empresa atual.
   */
  const addAnuncio = async (data: AnuncioInput): Promise<boolean> => {
    if (!user || !currentCompany?.id) {
      toast.error('Selecione uma empresa para cadastrar um produto.');
      return false;
    }

    try {
      const payload = {
        ...data,
        user_id: user.id,
        company_id: currentCompany.id
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
   * Atualiza um anúncio existente, garantindo que pertença à empresa.
   */
  const updateAnuncio = async (id: string, data: Partial<AnuncioInput>): Promise<boolean> => {
    if (!currentCompany?.id) return false;

    try {
      const { error } = await supabase
        .from('anuncios')
        .update(data)
        .eq('id', id)
        .eq('company_id', currentCompany.id);

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
   * Exclui um anúncio, garantindo que pertença à empresa.
   */
  const deleteAnuncio = async (id: string): Promise<boolean> => {
    if (!currentCompany?.id) return false;

    try {
      const { error } = await supabase
        .from('anuncios')
        .delete()
        .eq('id', id)
        .eq('company_id', currentCompany.id);

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
