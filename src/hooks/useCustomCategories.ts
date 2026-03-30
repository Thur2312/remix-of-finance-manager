import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CustomCategory {
  id: string;
  name: string;
  icon: string;
  user_id: string;
  created_at: string;
}

export const ICON_OPTIONS = [
  { value: 'FolderOpen', label: 'Pasta' },
  { value: 'Building2', label: 'Empresa' },
  { value: 'Laptop', label: 'Tecnologia' },
  { value: 'Megaphone', label: 'Marketing' },
  { value: 'CreditCard', label: 'Financeiro' },
  { value: 'Receipt', label: 'Tributação' },
  { value: 'Truck', label: 'Logística' },
  { value: 'Package', label: 'Produto' },
  { value: 'ShoppingBag', label: 'Compras' },
  { value: 'Users', label: 'Pessoas' },
  { value: 'Wrench', label: 'Manutenção' },
  { value: 'Globe', label: 'Online' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const from = (table: string) => (supabase as any).from(table);

export function useCustomCategories() {
  const { user } = useAuth();
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchCategories = async () => {
      setIsLoading(true);
      const { data, error } = await from('custom_cost_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setCustomCategories(data as CustomCategory[]);
      }
      setIsLoading(false);
    };

    fetchCategories();
  }, [user]);

  const addCategory = async (name: string, icon: string): Promise<boolean> => {
    if (!user) return false;

    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Informe um nome para a categoria');
      return false;
    }

    const { data, error } = await from('custom_cost_categories')
      .insert({ name: trimmed, icon, user_id: user.id })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        toast.error('Você já tem uma categoria com esse nome');
      } else {
        toast.error('Erro ao criar categoria');
      }
      return false;
    }

    setCustomCategories(prev => [...prev, data as CustomCategory]);
    toast.success(`Categoria "${trimmed}" criada!`);
    return true;
  };

  const updateCategory = async (id: string, name: string, icon: string): Promise<boolean> => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Informe um nome para a categoria');
      return false;
    }

    const { data, error } = await from('custom_cost_categories')
      .update({ name: trimmed, icon })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast.error('Erro ao atualizar categoria');
      return false;
    }

    setCustomCategories(prev =>
      prev.map(c => (c.id === id ? (data as CustomCategory) : c))
    );
    toast.success('Categoria atualizada!');
    return true;
  };

  const deleteCategory = async (id: string, categoryName: string): Promise<boolean> => {
    // Verifica se há custos usando essa categoria antes de excluir
    const { count } = await supabase
      .from('fixed_costs')
      .select('*', { count: 'exact', head: true })
      .eq('category', categoryName)
      .eq('user_id', user!.id);

    if (count && count > 0) {
      toast.error(
        `Não é possível excluir — há ${count} custo(s) nessa categoria. Remova-os primeiro.`
      );
      return false;
    }

    const { error } = await from('custom_cost_categories')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir categoria');
      return false;
    }

    setCustomCategories(prev => prev.filter(c => c.id !== id));
    toast.success('Categoria excluída');
    return true;
  };

  return {
    customCategories,
    isLoading,
    addCategory,
    updateCategory,
    deleteCategory,
  };
}