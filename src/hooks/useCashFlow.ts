import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface CashFlowCategory {
  id: string;
  user_id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CashFlowEntry {
  id: string;
  user_id: string;
  category_id: string | null;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  status: 'pending' | 'paid' | 'received';
  due_date: string | null;
  is_recurring: boolean;
  recurrence_type: 'weekly' | 'monthly' | 'yearly' | null;
  recurrence_end_date: string | null;
  parent_entry_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  category?: CashFlowCategory;
}

export type NewCashFlowCategory = Omit<CashFlowCategory, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type NewCashFlowEntry = Omit<CashFlowEntry, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'category'>;

const DEFAULT_CATEGORIES: Omit<NewCashFlowCategory, 'is_default'>[] = [
  // Income categories
  { name: 'Vendas', type: 'income', color: '#10B981', icon: 'shopping-cart' },
  { name: 'Serviços', type: 'income', color: '#3B82F6', icon: 'briefcase' },
  { name: 'Empréstimos', type: 'income', color: '#8B5CF6', icon: 'banknote' },
  { name: 'Outros Recebimentos', type: 'income', color: '#6B7280', icon: 'plus-circle' },
  // Expense categories
  { name: 'Fornecedores', type: 'expense', color: '#EF4444', icon: 'truck' },
  { name: 'Impostos', type: 'expense', color: '#F59E0B', icon: 'file-text' },
  { name: 'Marketing', type: 'expense', color: '#EC4899', icon: 'megaphone' },
  { name: 'Aluguel', type: 'expense', color: '#14B8A6', icon: 'home' },
  { name: 'Salários', type: 'expense', color: '#6366F1', icon: 'users' },
  { name: 'Logística', type: 'expense', color: '#F97316', icon: 'package' },
  { name: 'Outras Despesas', type: 'expense', color: '#6B7280', icon: 'minus-circle' },
];

export function useCashFlowCategories() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ['cash-flow-categories', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('cash_flow_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      return data as CashFlowCategory[];
    },
    enabled: !!user?.id,
  });

  const initializeDefaultCategories = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const categories = DEFAULT_CATEGORIES.map(cat => ({
        ...cat,
        user_id: user.id,
        is_default: true,
      }));

      const { error } = await supabase
        .from('cash_flow_categories')
        .insert(categories);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-flow-categories', user?.id] });
    },
    onError: (error) => {
      console.error('Error initializing categories:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar as categorias padrão.',
        variant: 'destructive',
      });
    },
  });

  const createCategory = useMutation({
    mutationFn: async (category: NewCashFlowCategory) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('cash_flow_categories')
        .insert({ ...category, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-flow-categories', user?.id] });
      toast({ title: 'Categoria criada com sucesso!' });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a categoria.',
        variant: 'destructive',
      });
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CashFlowCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from('cash_flow_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-flow-categories', user?.id] });
      toast({ title: 'Categoria atualizada!' });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a categoria.',
        variant: 'destructive',
      });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cash_flow_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-flow-categories', user?.id] });
      toast({ title: 'Categoria excluída!' });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a categoria.',
        variant: 'destructive',
      });
    },
  });

  return {
    categories: categoriesQuery.data ?? [],
    isLoading: categoriesQuery.isLoading,
    error: categoriesQuery.error,
    initializeDefaultCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}

export function useCashFlowEntries(filters?: {
  startDate?: string;
  endDate?: string;
  type?: 'income' | 'expense';
  status?: 'pending' | 'paid' | 'received';
  categoryId?: string;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const entriesQuery = useQuery({
    queryKey: ['cash-flow-entries', user?.id, filters],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('cash_flow_entries')
        .select(`
          *,
          category:cash_flow_categories(*)
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
      }
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CashFlowEntry[];
    },
    enabled: !!user?.id,
  });

  const createEntry = useMutation({
    mutationFn: async (entry: NewCashFlowEntry) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('cash_flow_entries')
        .insert({ ...entry, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-flow-entries', user?.id] });
      toast({ title: 'Lançamento criado com sucesso!' });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o lançamento.',
        variant: 'destructive',
      });
    },
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CashFlowEntry> & { id: string }) => {
      const { data, error } = await supabase
        .from('cash_flow_entries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-flow-entries', user?.id] });
      toast({ title: 'Lançamento atualizado!' });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o lançamento.',
        variant: 'destructive',
      });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cash_flow_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-flow-entries', user?.id] });
      toast({ title: 'Lançamento excluído!' });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o lançamento.',
        variant: 'destructive',
      });
    },
  });

  const updateEntryStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'pending' | 'paid' | 'received' }) => {
      const { data, error } = await supabase
        .from('cash_flow_entries')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-flow-entries', user?.id] });
      toast({ title: 'Status atualizado!' });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive',
      });
    },
  });

  return {
    entries: entriesQuery.data ?? [],
    isLoading: entriesQuery.isLoading,
    error: entriesQuery.error,
    createEntry,
    updateEntry,
    deleteEntry,
    updateEntryStatus,
  };
}
