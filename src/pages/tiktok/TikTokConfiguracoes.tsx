import { useState, useEffect, useCallback } from 'react';
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
import { Feature, motion } from 'framer-motion';
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
import { TikTokSettingsData } from '@/lib/tiktok-calculations';
import { FeatureGate } from '@/components/FeatureGate';



const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const settingsSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  taxa_comissao_tiktok: z.number().min(0).max(1),
  taxa_afiliado: z.number().min(0).max(1),
  adicional_por_item: z.number().min(0),
  percentual_valor_antecipado: z.number().min(0).max(1),
  taxa_antecipacao: z.number().min(0).max(1),
  imposto_nf_saida: z.number().min(0).max(1),
  percentual_nf_entrada: z.number().min(0).max(1),
  desconto_nf_saida: z.number().min(0).max(1),
  gasto_tiktok_ads: z.number().min(0),
  is_default: z.boolean(),
});

const defaultSettings = {
  name: 'Padrão TikTok Shop',
  taxa_comissao_tiktok: 0.20,
  taxa_afiliado: 0,
  adicional_por_item: 0,
  percentual_valor_antecipado: 0,
  taxa_antecipacao: 0,
  imposto_nf_saida: 0,
  percentual_nf_entrada: 0,
  desconto_nf_saida: 0,
  gasto_tiktok_ads: 0,
  is_default: true,
};

interface SettingsRow extends TikTokSettingsData {
  created_at: string;
  updated_at: string;
}

function TikTokConfiguracoesContent() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingsRow[]>([]);
  const [selectedSettings, setSelectedSettings] = useState<SettingsRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState(defaultSettings);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('tiktok_settings')
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
  }, []);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [fetchSettings, user]);

  const selectSettings = (setting: SettingsRow) => {
    setSelectedSettings(setting);
    setIsCreating(false);
    setFormData({
      name: setting.name,
      taxa_comissao_tiktok: Number(setting.taxa_comissao_tiktok),
      taxa_afiliado: Number(setting.taxa_afiliado),
      adicional_por_item: Number(setting.adicional_por_item),
      percentual_valor_antecipado: Number(setting.percentual_valor_antecipado),
      taxa_antecipacao: Number(setting.taxa_antecipacao),
      imposto_nf_saida: Number(setting.imposto_nf_saida),
      percentual_nf_entrada: Number(setting.percentual_nf_entrada),
      desconto_nf_saida: Number(setting.desconto_nf_saida),
      gasto_tiktok_ads: Number(setting.gasto_tiktok_ads) || 0,
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
      if (formData.is_default && settings.some(s => s.is_default && s.id !== selectedSettings?.id)) {
        await supabase
          .from('tiktok_settings')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      if (isCreating) {
        const { data, error } = await supabase
          .from('tiktok_settings')
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
          .from('tiktok_settings')
          .update(formData)
          .eq('id', selectedSettings.id);

        if (error) throw error;
        
        toast.success('Configuração salva com sucesso!');
        await fetchSettings();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar configuração';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSettings || !user) return;

    setIsDeleting(true);

    try {
      // Apagar todos os dados relacionados ao TikTok
      const [ordersResult, settlementsResult, statementsResult] = await Promise.all([
        supabase.from('tiktok_orders').delete().eq('user_id', user.id),
        supabase.from('tiktok_settlements').delete().eq('user_id', user.id),
        supabase.from('tiktok_statements').delete().eq('user_id', user.id),
      ]);

      if (ordersResult.error || settlementsResult.error || statementsResult.error) {
        console.error('Error deleting data:', { ordersResult, settlementsResult, statementsResult });
        toast.error('Erro ao excluir dados');
        setIsDeleting(false);
        return;
      }

      // Apagar configuração
      const { error } = await supabase
        .from('tiktok_settings')
        .delete()
        .eq('id', selectedSettings.id);

      if (error) throw error;

      toast.success('Configuração e todos os dados TikTok excluídos com sucesso!');
      await fetchSettings();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao excluir configuração';
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <FeatureGate permission="config_access" requiredPlanName="Essencial">
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Configurações TikTok Shop</h2>
          <p className="text-gray-600">
            Defina os parâmetros de cálculo para suas vendas no TikTok Shop
          </p>
        </div>
        <Button
          onClick={handleNewSettings}
          className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Configuração
        </Button>
      </motion.div>

      <motion.div variants={fadeInUp} className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 border border-blue-200 shadow-lg bg-white">
          <CardHeader className="pb-3 bg-blue-50 border-b border-blue-200">
            <CardTitle className="text-base text-gray-900">Configurações Salvas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {settings.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-4">
                Nenhuma configuração salva
              </p>
            ) : (
              settings.map((setting) => (
                <button
                  key={setting.id}
                  onClick={() => selectSettings(setting)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedSettings?.id === setting.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-transparent hover:bg-blue-25'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-sm truncate text-gray-900">{setting.name}</span>
                  </div>
                  {setting.is_default && (
                    <span className="text-xs text-blue-600">Padrão</span>
                  )}
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border border-blue-200 shadow-lg bg-white">
          <CardHeader className="bg-blue-50 border-b border-blue-200">
            <CardTitle className="text-gray-900">
              {isCreating ? 'Nova Configuração' : `Editar: ${selectedSettings?.name}`}
            </CardTitle>
            <CardDescription className="text-gray-600">
              Configure as taxas e parâmetros que serão usados nos cálculos de resultado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-900">Nome da Configuração</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ex: Padrão TikTok"
                  className={`border-blue-200 focus:border-blue-500 ${errors.name ? 'border-red-500' : ''}`}
                />
                {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
              </div>
              <div className="flex items-center space-x-3 pt-6">
                <Switch
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => handleInputChange('is_default', checked)}
                />
                <Label htmlFor="is_default" className="text-gray-900">Definir como padrão</Label>
              </div>
            </div>

            <Separator />

            <div>
              <div className="bg-gradient-to-r from-blue-50 to-white p-4 rounded-xl border border-blue-200">
                <h3 className="font-semibold mb-4 text-blue-700 flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-blue-100 flex items-center justify-center">
                    <Settings className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  Taxas do TikTok
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="taxa_comissao_tiktok" className="text-gray-900">Taxa de Comissão (%)</Label>
                  <div className="relative">
                    <Input
                      id="taxa_comissao_tiktok"
                      type="text"
                      inputMode="decimal"
                      value={getLocalValue('taxa_comissao_tiktok', formData.taxa_comissao_tiktok, true, false)}
                      onChange={(e) => handleLocalChange('taxa_comissao_tiktok', e.target.value, true, false)}
                      onBlur={() => handleLocalBlur('taxa_comissao_tiktok', formData.taxa_comissao_tiktok, true, false)}
                      placeholder="0"
                      className="pr-8 border-blue-200 focus:border-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">%</span>
                  </div>
                  <p className="text-xs text-gray-600">Porcentagem cobrada pelo TikTok</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxa_afiliado" className="text-gray-900">Taxa de Afiliado (%)</Label>
                  <div className="relative">
                    <Input
                      id="taxa_afiliado"
                      type="text"
                      inputMode="decimal"
                      value={getLocalValue('taxa_afiliado', formData.taxa_afiliado, true, false)}
                      onChange={(e) => handleLocalChange('taxa_afiliado', e.target.value, true, false)}
                      onBlur={() => handleLocalBlur('taxa_afiliado', formData.taxa_afiliado, true, false)}
                      placeholder="0"
                      className="pr-8 border-blue-200 focus:border-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">%</span>
                  </div>
                  <p className="text-xs text-gray-600">Comissão paga a afiliados</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adicional_por_item" className="text-gray-900">Adicional por Item (R$)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">R$</span>
                    <Input
                      id="adicional_por_item"
                      type="text"
                      inputMode="decimal"
                      value={getLocalValue('adicional_por_item', formData.adicional_por_item, false, true)}
                                            onChange={(e) => handleLocalChange('adicional_por_item', e.target.value, false, true)}
                      onBlur={() => handleLocalBlur('adicional_por_item', formData.adicional_por_item, false, true)}
                      placeholder="0,00"
                      className="pl-10 border-blue-200 focus:border-blue-500"
                    />
                  </div>
                  <p className="text-xs text-gray-600">Valor cobrado por cada item vendido</p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-4 text-blue-600">Antecipação</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="percentual_valor_antecipado" className="text-gray-900">% do Valor Antecipado</Label>
                  <div className="relative">
                    <Input
                      id="percentual_valor_antecipado"
                      type="text"
                      inputMode="decimal"
                      value={getLocalValue('percentual_valor_antecipado', formData.percentual_valor_antecipado, true, false)}
                      onChange={(e) => handleLocalChange('percentual_valor_antecipado', e.target.value, true, false)}
                      onBlur={() => handleLocalBlur('percentual_valor_antecipado', formData.percentual_valor_antecipado, true, false)}
                      placeholder="0"
                      className="pr-8 border-blue-200 focus:border-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxa_antecipacao" className="text-gray-900">Taxa de Antecipação (%)</Label>
                  <div className="relative">
                    <Input
                      id="taxa_antecipacao"
                      type="text"
                      inputMode="decimal"
                      value={getLocalValue('taxa_antecipacao', formData.taxa_antecipacao, true, false)}
                      onChange={(e) => handleLocalChange('taxa_antecipacao', e.target.value, true, false)}
                      onBlur={() => handleLocalBlur('taxa_antecipacao', formData.taxa_antecipacao, true, false)}
                      placeholder="0"
                      className="pr-8 border-blue-200 focus:border-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">%</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-4 text-blue-600">Impostos e Notas Fiscais</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="imposto_nf_saida" className="text-gray-900">Imposto NF Saída (%)</Label>
                  <div className="relative">
                    <Input
                      id="imposto_nf_saida"
                      type="text"
                      inputMode="decimal"
                      value={getLocalValue('imposto_nf_saida', formData.imposto_nf_saida, true, false)}
                      onChange={(e) => handleLocalChange('imposto_nf_saida', e.target.value, true, false)}
                      onBlur={() => handleLocalBlur('imposto_nf_saida', formData.imposto_nf_saida, true, false)}
                      placeholder="0"
                      className="pr-8 border-blue-200 focus:border-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="percentual_nf_entrada" className="text-gray-900">% NF Entrada</Label>
                  <div className="relative">
                    <Input
                      id="percentual_nf_entrada"
                      type="text"
                      inputMode="decimal"
                      value={getLocalValue('percentual_nf_entrada', formData.percentual_nf_entrada, true, false)}
                      onChange={(e) => handleLocalChange('percentual_nf_entrada', e.target.value, true, false)}
                      onBlur={() => handleLocalBlur('percentual_nf_entrada', formData.percentual_nf_entrada, true, false)}
                      placeholder="0"
                      className="pr-8 border-blue-200 focus:border-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desconto_nf_saida" className="text-gray-900">Desconto Base Cálculo (%)</Label>
                  <div className="relative">
                    <Input
                      id="desconto_nf_saida"
                      type="text"
                      inputMode="decimal"
                      value={getLocalValue('desconto_nf_saida', formData.desconto_nf_saida, true, false)}
                      onChange={(e) => handleLocalChange('desconto_nf_saida', e.target.value, true, false)}
                      onBlur={() => handleLocalBlur('desconto_nf_saida', formData.desconto_nf_saida, true, false)}
                      placeholder="0"
                      className="pr-8 border-blue-200 focus:border-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600">%</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-4 text-blue-600">Custos de Publicidade</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gasto_tiktok_ads" className="text-gray-900">Gasto com TikTok Ads (R$)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600">R$</span>
                    <Input
                      id="gasto_tiktok_ads"
                      type="text"
                      inputMode="decimal"
                      value={getLocalValue('gasto_tiktok_ads', formData.gasto_tiktok_ads, false, true)}
                      onChange={(e) => handleLocalChange('gasto_tiktok_ads', e.target.value, false, true)}
                      onBlur={() => handleLocalBlur('gasto_tiktok_ads', formData.gasto_tiktok_ads, false, true)}
                      placeholder="0,00"
                      className="pl-10 border-blue-200 focus:border-blue-500"
                    />
                  </div>
                  <p className="text-xs text-gray-600">Valor total gasto com anúncios no TikTok</p>
                </div>
              </div>
            </div>

            <Separator />

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
                        className="bg-red-600 hover:bg-red-700"
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
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="sm:order-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
              >
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
      </motion.div>
    </motion.div>
      </FeatureGate>
  );
}

export default function TikTokConfiguracoes() {
  return (
    <ProtectedRoute>
      <AppLayout title="Configurações TikTok">
        <TikTokConfiguracoesContent />
      </AppLayout>
    </ProtectedRoute>
  );
}