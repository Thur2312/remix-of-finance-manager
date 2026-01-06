import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface FixedCost {
  id: string;
  user_id: string;
  category: string;
  name: string;
  amount: number;
  is_recurring: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FixedCostsSettings {
  id: string;
  user_id: string;
  monthly_orders: number;
  monthly_products_sold: number;
  monthly_revenue: number;
  created_at: string;
  updated_at: string;
}

export const COST_CATEGORIES = [
  {
    name: "Estrutura Administrativa",
    examples: ["Pró-labore", "Salários", "Encargos trabalhistas", "Contabilidade", "Serviços administrativos"]
  },
  {
    name: "Infraestrutura & Operação",
    examples: ["Aluguel", "Condomínio", "Energia elétrica", "Água", "Internet", "Telefonia", "Limpeza", "Segurança"]
  },
  {
    name: "Tecnologia & Ferramentas",
    examples: ["ERP", "Sistema de gestão", "Emissão de NF", "BI/Dashboards", "CRM", "WhatsApp Business API", "Google Workspace", "Notion", "SaaS"]
  },
  {
    name: "Marketing Fixo",
    examples: ["Agência", "Designer", "Social Media", "Ferramentas de criação", "Produção de conteúdo"]
  },
  {
    name: "Financeiro & Bancário",
    examples: ["Conta PJ", "Tarifas bancárias", "Gateways", "Sistemas financeiros"]
  },
  {
    name: "Tributação Fixa",
    examples: ["DAS Simples Nacional", "Licenças e alvarás"]
  },
  {
    name: "Logística Estrutural",
    examples: ["Galpão", "Operador logístico", "Software logístico", "Equipamentos (rateio)"]
  },
  {
    name: "Despesas Recorrentes Diversas",
    examples: ["Seguros", "Manutenção", "Assinaturas", "Material de escritório"]
  }
];

export function useFixedCosts() {
  const { user } = useAuth();
  const [costs, setCosts] = useState<FixedCost[]>([]);
  const [settings, setSettings] = useState<FixedCostsSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch fixed costs
  const fetchCosts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('fixed_costs')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setCosts((data as FixedCost[]) || []);
    } catch (error) {
      console.error('Erro ao buscar custos fixos:', error);
      toast.error('Erro ao carregar custos fixos');
    }
  };

  // Fetch settings
  const fetchSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('fixed_costs_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSettings(data as FixedCostsSettings);
      } else {
        // Create default settings
        const { data: newSettings, error: insertError } = await supabase
          .from('fixed_costs_settings')
          .insert({
            user_id: user.id,
            monthly_orders: 100,
            monthly_products_sold: 100,
            monthly_revenue: 0
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(newSettings as FixedCostsSettings);
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
    }
  };

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchCosts(), fetchSettings()]);
      setIsLoading(false);
    };

    if (user) {
      loadData();
    }
  }, [user]);

  // Add cost
  const addCost = async (cost: Omit<FixedCost, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('fixed_costs')
        .insert({
          ...cost,
          user_id: user.id
        });

      if (error) throw error;
      
      toast.success('Custo adicionado com sucesso');
      await fetchCosts();
      return true;
    } catch (error) {
      console.error('Erro ao adicionar custo:', error);
      toast.error('Erro ao adicionar custo');
      return false;
    }
  };

  // Update cost
  const updateCost = async (id: string, cost: Partial<Omit<FixedCost, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    try {
      const { error } = await supabase
        .from('fixed_costs')
        .update(cost)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Custo atualizado com sucesso');
      await fetchCosts();
      return true;
    } catch (error) {
      console.error('Erro ao atualizar custo:', error);
      toast.error('Erro ao atualizar custo');
      return false;
    }
  };

  // Delete cost
  const deleteCost = async (id: string) => {
    try {
      const { error } = await supabase
        .from('fixed_costs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Custo removido com sucesso');
      await fetchCosts();
      return true;
    } catch (error) {
      console.error('Erro ao remover custo:', error);
      toast.error('Erro ao remover custo');
      return false;
    }
  };

  // Update settings
  const updateSettings = async (newSettings: Partial<Pick<FixedCostsSettings, 'monthly_orders' | 'monthly_products_sold' | 'monthly_revenue'>>) => {
    if (!user || !settings) return false;

    try {
      const { error } = await supabase
        .from('fixed_costs_settings')
        .update(newSettings)
        .eq('id', settings.id);

      if (error) throw error;
      
      setSettings({ ...settings, ...newSettings });
      return true;
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      toast.error('Erro ao salvar configurações');
      return false;
    }
  };

  // Calculate metrics
  const totalRecurringCosts = costs
    .filter(c => c.is_recurring)
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const costPerOrder = settings?.monthly_orders && settings.monthly_orders > 0
    ? totalRecurringCosts / settings.monthly_orders
    : 0;

  const costPerProduct = settings?.monthly_products_sold && settings.monthly_products_sold > 0
    ? totalRecurringCosts / settings.monthly_products_sold
    : 0;

  const costPercentage = settings?.monthly_revenue && settings.monthly_revenue > 0
    ? (totalRecurringCosts / settings.monthly_revenue) * 100
    : 0;

  // Group costs by category
  const costsByCategory = costs.reduce((acc, cost) => {
    if (!acc[cost.category]) {
      acc[cost.category] = [];
    }
    acc[cost.category].push(cost);
    return acc;
  }, {} as Record<string, FixedCost[]>);

  return {
    costs,
    settings,
    isLoading,
    addCost,
    updateCost,
    deleteCost,
    updateSettings,
    fetchCosts,
    // Metrics
    totalRecurringCosts,
    costPerOrder,
    costPerProduct,
    costPercentage,
    costsByCategory
  };
}
