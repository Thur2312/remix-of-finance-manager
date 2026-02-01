import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Save, Plus, Trash2, Settings, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { z } from 'zod';

interface SettingsData {
  id: string;
  user_id: string;
  name: string;
  taxa_comissao_shopee: number;
  adicional_por_item: number;
  percentual_valor_antecipado: number;
  taxa_antecipacao: number;
  imposto_nf_saida: number;
  percentual_nf_entrada: number;
  desconto_nf_saida: number;
  gasto_shopee_ads: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const settingsSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  taxa_comissao_shopee: z.number().min(0).max(1),
  adicional_por_item: z.number().min(0),
  percentual_valor_antecipado: z.number().min(0).max(1),
  taxa_antecipacao: z.number().min(0).max(1),
  imposto_nf_saida: z.number().min(0).max(1),
  percentual_nf_entrada: z.number().min(0).max(1),
  desconto_nf_saida: z.number().min(0).max(1),
  gasto_shopee_ads: z.number().min(0),
  is_default: z.boolean(),
});

const defaultSettings = {
  name: 'Padrão Shopee',
  taxa_comissao_shopee: 0.20,
  adicional_por_item: 0,
  percentual_valor_antecipado: 0,
  taxa_antecipacao: 0,
  imposto_nf_saida: 0,
  percentual_nf_entrada: 0,
  desconto_nf_saida: 0,
  gasto_shopee_ads: 0,
  is_default: true,
};

function ConfiguracoesContent() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingsData[]>([]);
  const [selectedSettings, setSelectedSettings] = useState<SettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState(defaultSettings);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      toast.error('Erro ao carregar configurações');
      console.error(error);
    } else {
      setSettings(data || []);
      if (data && data.length > 0) {
        const defaultSetting = data.find(s => s.is_default) || data[0];
        selectSettings(defaultSetting);
      } else {
        setIsCreating(true);
      }
    }
    setIsLoading(false);
  };

  const selectSettings = (setting: SettingsData) => {
    setSelectedSettings(setting);
    setIsCreating(false);
    setFormData({
      name: setting.name,
      taxa_comissao_shopee: Number(setting.taxa_comissao_shopee),
      adicional_por_item: Number(setting.adicional_por_item),
      percentual_valor_antecipado: Number(setting.percentual_valor_antecipado),
      taxa_antecipacao: Number(setting.taxa_antecipacao),
      imposto_nf_saida: Number(setting.imposto_nf_saida),
      percentual_nf_entrada: Number(setting.percentual_nf_entrada),
      desconto_nf_saida: Number(setting.desconto_nf_saida),
      gasto_shopee_ads: Number(setting.gasto_shopee_ads) || 0,
      is_default: setting.is_default,
    });
    setErrors({});
  };

  const handleNewSettings = () => {
    setSelectedSettings(null);
    setIsCreating(true);
    setFormData({
      ...defaultSettings,
      name: `Configuração ${settings.length + 1}`,
      is_default: settings.length === 0,
    });
    setErrors({});
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handlePercentageChange = (field: string, value: string) => {
    // Permitir campo vazio para edição livre
    if (value === '') {
      handleInputChange(field, 0);
      return;
    }
    const cleanValue = value.replace(',', '.');
    const numValue = parseFloat(cleanValue) / 100;
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 1) {
      handleInputChange(field, numValue);
    }
  };

  const handleCurrencyChange = (field: string, value: string) => {
    // Permitir campo vazio para edição livre
    if (value === '') {
      handleInputChange(field, 0);
      return;
    }
    const cleanValue = value.replace(',', '.');
    const numValue = parseFloat(cleanValue);
    if (!isNaN(numValue) && numValue >= 0) {
      handleInputChange(field, numValue);
    }
  };

  // Estados locais para permitir edição livre
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  const getLocalValue = (field: string, formValue: number, isPercentage: boolean, isCurrency: boolean) => {
    if (localValues[field] !== undefined) {
      return localValues[field];
    }
    if (isPercentage) {
      return formValue > 0 ? (formValue * 100).toString() : '';
    }
    if (isCurrency) {
      return formValue > 0 ? formValue.toString() : '';
    }
    return formValue.toString();
  };

  const handleLocalChange = (field: string, value: string, isPercentage: boolean, isCurrency: boolean) => {
    setLocalValues(prev => ({ ...prev, [field]: value }));
    if (isPercentage) {
      handlePercentageChange(field, value);
    } else if (isCurrency) {
      handleCurrencyChange(field, value);
    }
  };

  const handleLocalBlur = (field: string, formValue: number, isPercentage: boolean, isCurrency: boolean) => {
    // Ao sair do campo, remover do estado local para mostrar valor formatado
    setLocalValues(prev => {
      const newValues = { ...prev };
      delete newValues[field];
      return newValues;
    });
  };

  const validateForm = (): boolean => {
    try {
      settingsSchema.parse(formData);
      setErrors({});
      return true;
    } catch (e) {
      if (e instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        e.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSave = async () => {
    if (!user || !validateForm()) return;

    setIsSaving(true);

    try {
      // If setting as default, unset other defaults
      if (formData.is_default && settings.some(s => s.is_default && s.id !== selectedSettings?.id)) {
        await supabase
          .from('settings')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      if (isCreating) {
        const { data, error } = await supabase
          .from('settings')
          .insert({
            user_id: user.id,
            ...formData,
          })
          .select()
          .single();

        if (error) throw error;
        
        toast.success('Configuração criada com sucesso!');
        await fetchSettings();
        if (data) selectSettings(data);
      } else if (selectedSettings) {
        const { error } = await supabase
          .from('settings')
          .update(formData)
          .eq('id', selectedSettings.id);

        if (error) throw error;
        
        toast.success('Configuração salva com sucesso!');
        await fetchSettings();
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar configuração');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSettings || !user) return;

    setIsDeleting(true);

    try {
      // Always delete orders when deleting configuration
      const { error: ordersError } = await supabase
        .from('raw_orders')
        .delete()
        .eq('user_id', user.id);

      if (ordersError) {
        console.error('Error deleting orders:', ordersError);
        toast.error('Erro ao excluir pedidos');
        setIsDeleting(false);
        return;
      }

      const { error } = await supabase
        .from('settings')
        .delete()
        .eq('id', selectedSettings.id);

      if (error) throw error;

      toast.success('Configuração e dados excluídos com sucesso!');
      await fetchSettings();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir configuração');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/20">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Configurações Financeiras</h2>
            <p className="text-muted-foreground">
              Defina os parâmetros de cálculo para suas vendas na Shopee
            </p>
          </div>
        </div>
        <Button onClick={handleNewSettings} className="shadow-md">
          <Plus className="h-4 w-4 mr-2" />
          Nova Configuração
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Settings List */}
        <Card className="lg:col-span-1 border-0 shadow-md">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <CardTitle className="text-base font-semibold">Configurações Salvas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            {settings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma configuração salva
              </p>
            ) : (
              settings.map((setting) => (
                <button
                  key={setting.id}
                  onClick={() => selectSettings(setting)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all duration-200 ${
                    selectedSettings?.id === setting.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-transparent hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                      selectedSettings?.id === setting.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}>
                      <Settings className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm truncate block">{setting.name}</span>
                      {setting.is_default && (
                        <span className="text-xs text-primary font-medium">Padrão</span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Settings Form */}
        <Card className="lg:col-span-3 border-0 shadow-md">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-xl">
              {isCreating ? 'Nova Configuração' : `Editar: ${selectedSettings?.name}`}
            </CardTitle>
            <CardDescription>
              Configure as taxas e parâmetros que serão usados nos cálculos de resultado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Name and Default */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-medium">Nome da Configuração</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ex: Padrão Shopee"
                  className={`shadow-sm ${errors.name ? 'border-destructive' : ''}`}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="flex items-center space-x-3 pt-6">
                <Switch
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => handleInputChange('is_default', checked)}
                />
                <Label htmlFor="is_default" className="font-medium">Definir como padrão</Label>
              </div>
            </div>

            <Separator />

            {/* Shopee Fees */}
            <div className="bg-gradient-to-r from-primary/5 to-transparent p-4 rounded-xl -mx-2">
              <h3 className="font-semibold mb-4 text-primary flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-primary/15 flex items-center justify-center">
                  <Settings className="h-3.5 w-3.5 text-primary" />
                </div>
                Taxas da Shopee
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="taxa_comissao_shopee">Taxa de Comissão (%)</Label>
                  <div className="relative">
                    <Input
                      id="taxa_comissao_shopee"
                      type="text"
                      inputMode="decimal"
                      value={getLocalValue('taxa_comissao_shopee', formData.taxa_comissao_shopee, true, false)}
                      onChange={(e) => handleLocalChange('taxa_comissao_shopee', e.target.value, true, false)}
                      onBlur={() => handleLocalBlur('taxa_comissao_shopee', formData.taxa_comissao_shopee, true, false)}
                      placeholder="0"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Porcentagem cobrada pela Shopee sobre o valor vendido</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adicional_por_item">Adicional por Item (R$)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      id="adicional_por_item"
                      type="text"
                      inputMode="decimal"
                      value={getLocalValue('adicional_por_item', formData.adicional_por_item, false, true)}
                      onChange={(e) => handleLocalChange('adicional_por_item', e.target.value, false, true)}
                      onBlur={() => handleLocalBlur('adicional_por_item', formData.adicional_por_item, false, true)}
                      placeholder="0,00"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Valor cobrado por cada item vendido</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Anticipation */}
            <div>
              <h3 className="font-semibold mb-4 text-primary">Antecipação</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="percentual_valor_antecipado">% do Valor Antecipado</Label>
                  <div className="relative">
                    <Input
                      id="percentual_valor_antecipado"
                      type="text"
                      inputMode="decimal"
                      value={getLocalValue('percentual_valor_antecipado', formData.percentual_valor_antecipado, true, false)}
                      onChange={(e) => handleLocalChange('percentual_valor_antecipado', e.target.value, true, false)}
                      onBlur={() => handleLocalBlur('percentual_valor_antecipado', formData.percentual_valor_antecipado, true, false)}
                      placeholder="0"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Percentual do valor que é antecipado</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxa_antecipacao">Taxa de Antecipação (%)</Label>
                  <div className="relative">
                    <Input
                      id="taxa_antecipacao"
                      type="text"
                      inputMode="decimal"
                      value={getLocalValue('taxa_antecipacao', formData.taxa_antecipacao, true, false)}
                      onChange={(e) => handleLocalChange('taxa_antecipacao', e.target.value, true, false)}
                      onBlur={() => handleLocalBlur('taxa_antecipacao', formData.taxa_antecipacao, true, false)}
                      placeholder="0"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Taxa cobrada sobre o valor antecipado</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Taxes */}
            <div>
              <h3 className="font-semibold mb-4 text-primary">Impostos e Notas Fiscais</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="imposto_nf_saida">Imposto NF Saída (%)</Label>
                  <div className="relative">
                    <Input
                      id="imposto_nf_saida"
                      type="text"
                      inputMode="decimal"
                      value={getLocalValue('imposto_nf_saida', formData.imposto_nf_saida, true, false)}
                      onChange={(e) => handleLocalChange('imposto_nf_saida', e.target.value, true, false)}
                      onBlur={() => handleLocalBlur('imposto_nf_saida', formData.imposto_nf_saida, true, false)}
                      placeholder="0"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Imposto sobre NF de saída</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="percentual_nf_entrada">% NF Entrada</Label>
                  <div className="relative">
                    <Input
                      id="percentual_nf_entrada"
                      type="text"
                      inputMode="decimal"
                      value={getLocalValue('percentual_nf_entrada', formData.percentual_nf_entrada, true, false)}
                      onChange={(e) => handleLocalChange('percentual_nf_entrada', e.target.value, true, false)}
                      onBlur={() => handleLocalBlur('percentual_nf_entrada', formData.percentual_nf_entrada, true, false)}
                      placeholder="0"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">% do custo para NF entrada</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desconto_nf_saida">Desconto NF Saída (%)</Label>
                  <div className="relative">
                    <Input
                      id="desconto_nf_saida"
                      type="text"
                      inputMode="decimal"
                      value={getLocalValue('desconto_nf_saida', formData.desconto_nf_saida, true, false)}
                      onChange={(e) => handleLocalChange('desconto_nf_saida', e.target.value, true, false)}
                      onBlur={() => handleLocalBlur('desconto_nf_saida', formData.desconto_nf_saida, true, false)}
                      placeholder="0"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Desconto aplicado antes do imposto</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Shopee Ads */}
            <div>
              <h3 className="font-semibold mb-4 text-primary">Shopee Ads (Opcional)</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gasto_shopee_ads">Gasto Total com Ads (R$)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      id="gasto_shopee_ads"
                      type="text"
                      inputMode="decimal"
                      value={getLocalValue('gasto_shopee_ads', formData.gasto_shopee_ads, false, true)}
                      onChange={(e) => handleLocalChange('gasto_shopee_ads', e.target.value, false, true)}
                      onBlur={() => handleLocalBlur('gasto_shopee_ads', formData.gasto_shopee_ads, false, true)}
                      className="pl-10"
                      placeholder="0,00"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Valor total gasto com anúncios no período. Será descontado do lucro total.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              {!isCreating && selectedSettings && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="sm:order-1">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir configuração e dados?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. A configuração "{selectedSettings.name}" e{' '}
                        <strong>todos os pedidos importados</strong> serão permanentemente excluídos,
                        zerando a análise atual.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDelete} 
                        className="bg-destructive hover:bg-destructive/90"
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Excluindo...
                          </>
                        ) : (
                          'Excluir Tudo'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button onClick={handleSave} disabled={isSaving} className="sm:order-2">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isCreating ? 'Criar Configuração' : 'Salvar Alterações'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Configuracoes() {
  return (
    <ProtectedRoute>
      <AppLayout title="Configurações">
        <ConfiguracoesContent />
      </AppLayout>
    </ProtectedRoute>
  );
}
