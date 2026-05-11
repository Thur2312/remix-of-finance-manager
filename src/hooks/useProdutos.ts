import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ─── Tipos baseados no database.types.ts ────────────────────────────────────

export interface Anuncio {
  id: string;
  user_id: string | null;
  nome_anuncio: string;
  marketplace: string | null;
  custo: number;
  valor_venda: number;
  comissao_taxa: string;   // string no banco (ex: "20" ou "4.5")
  antecipado: number;
  afiliados: number;
  imposto_pct: number;
  custo_var: number;
  taxafixa: number | null;
  criado_em: string;
  atualizado_em: string;
}

export interface AnuncioInput {
  nome_anuncio: string;
  marketplace: string;
  custo: number;
  valor_venda: number;
  comissao_taxa: string;
  antecipado: number;
  afiliados: number;
  imposto_pct: number;
  custo_var: number;
  taxafixa?: number | null;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAnuncios() {
  const { user } = useAuth();
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Buscar anúncios ──────────────────────────────────────────────────────
  const fetchAnuncios = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('anuncios')
        .select('*')
        .order('atualizado_em', { ascending: false });

      if (error) throw error;
      setAnuncios((data as Anuncio[]) || []);
    } catch (error) {
      console.error('Erro ao buscar anúncios:', error);
      toast.error('Erro ao carregar anúncios');
    }
  }, [user]);

  // ── Carregar na montagem ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setIsLoading(true);
      await fetchAnuncios();
      setIsLoading(false);
    };

    load();
  }, [user, fetchAnuncios]);

  // ── Adicionar anúncio ────────────────────────────────────────────────────
  const addAnuncio = async (input: AnuncioInput): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('anuncios')
        .insert({
          ...input,
          user_id: user.id,
        });

      if (error) throw error;

      toast.success('Anúncio cadastrado com sucesso!');
      await fetchAnuncios();
      return true;
    } catch (error) {
      console.error('Erro ao cadastrar anúncio:', error);
      toast.error('Erro ao cadastrar anúncio');
      return false;
    }
  };

  // ── Atualizar anúncio ────────────────────────────────────────────────────
  const updateAnuncio = async (id: string, input: AnuncioInput): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('anuncios')
        .update(input)
        .eq('id', id);

      if (error) throw error;

      toast.success('Anúncio atualizado com sucesso!');
      await fetchAnuncios();
      return true;
    } catch (error) {
      console.error('Erro ao atualizar anúncio:', error);
      toast.error('Erro ao atualizar anúncio');
      return false;
    }
  };

  // ── Deletar anúncio ──────────────────────────────────────────────────────
  const deleteAnuncio = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('anuncios')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Anúncio removido com sucesso!');
      await fetchAnuncios();
      return true;
    } catch (error) {
      console.error('Erro ao remover anúncio:', error);
      toast.error('Erro ao remover anúncio');
      return false;
    }
  };

  return {
    anuncios,
    isLoading,
    fetchAnuncios,
    addAnuncio,
    updateAnuncio,
    deleteAnuncio,
  };
}