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
import { InPageNav, mercadolivreNavTabs } from '@/components/layout/InPageNav';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MLSettingsData {
  id: string;
  user_id: string;
  name: string;
  taxa_comissao_ml: number;
  taxa_afiliado: number;
  adicional_por_item: number;
  percentual_valor_antecipado: number;
  taxa_antecipacao: number;
  imposto_nf_saida: number;
  percentual_nf_entrada: number;
  desconto_nf_saida: number;
  gasto_ml_ads: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const mlSettingsSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  taxa_comissao_ml: z.number().min(0).max(1),
  taxa_afiliado: z.number().min(0).max(1),
  adicional_por_item: z.number().min(0),
  percentual_valor_antecipado: z.number().min(0).max(1),
  taxa_antecipacao: z.number().min(0).max(1),
  imposto_nf_saida: z.number().min(0).max(1),
  percentual_nf_entrada: z.number().min(0).max(1),
  desconto_nf_saida: z.number().min(0).max(1),
  gasto_ml_ads: z.number().min(0),
  is_default: z.boolean(),
});

const defaultMLSettings = {
  name: 'Padrão Mercado Livre',
  taxa_comissao_ml: 0.12,
  taxa_afiliado: 0,
  adicional_por_item: 0,
  percentual_valor_antecipado: 0,
  taxa_antecipacao: 0,
  imposto_nf_saida: 0,
  percentual_nf_entrada: 0,
  desconto_nf_saida: 0,
  gasto_ml_ads: 0,
  is_default: true,
};

// ─── Content ──────────────────────────────────────────────────────────────────
function ConfiguracoesContent() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<MLSettingsData[]>([]);
  const [selectedSettings, setSelectedSettings] = useState<MLSettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState(defaultMLSettings);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('ml_settings')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('ml_settings table not found or error:', error.message);
      setSettings([]);
      setIsCreating(true);
    } else {
      setSettings((data as MLSettingsData[]) || []);
      if (data && data.length > 0) {
        const defaultSetting = (data as MLSettingsData[]).find((s) => s.is_default) || (data as MLSettingsData[])[0];
        selectSettings(defaultSetting);
      } else {
        setIsCreating(true);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (user) fetchSettings();
  }, [fetchSettings, user]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const selectSettings = (setting: MLSettingsData) => {
    setSelectedSettings(setting);
    setIsCreating(false);
    setFormData({
      name: setting.name,
      taxa_comissao_ml: Number(setting.taxa_comissao_ml),
      taxa_afiliado: Number(setting.taxa_afiliado),
      adicional_por_item: Number(setting.adicional_por_item),
      percentual_valor_antecipado: Number(setting.percentual_valor_antecipado),
      taxa_antecipacao: Number(setting.taxa_antecipacao),
      imposto_nf_saida: Number(setting.imposto_nf_saida),
      percentual_nf_entrada: Number(setting.percentual_nf_entrada),
      desconto_nf_saida: Number(setting.desconto_nf_saida),
      gasto_ml_ads: Number(setting.gasto_ml_ads) || 0,
      is_default: setting.is_default,
    });
    setErrors({});
    setLocalValues({});
  };

  const handleNewSettings = () => {
    setSelectedSettings(null);
    setIsCreating(true);
    setFormData({
      ...defaultMLSettings,
      name: `Configuração ${settings.length + 1}`,
      is_default: settings.length === 0,
    });
    setErrors({});
    setLocalValues({});
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const getLocalValue = (field: string, formValue: number, isPercentage: boolean) => {
    if (localValues[field] !== undefined) return localValues[field];
    if (isPercentage) return formValue > 0 ? (formValue * 100).toString() : '';
    return formValue > 0 ? formValue.toString() : '';
  };

  const handleLocalChange = (field: string, value: string, isPercentage: boolean) => {
    setLocalValues((prev) => ({ ...prev, [field]: value }));
    if (value === '') { handleInputChange(field, 0); return; }
    const clean = value.replace(',', '.');
    const num = parseFloat(clean);
    if (isNaN(num) || num < 0) return;
    handleInputChange(field, isPercentage ? num / 100 : num);
  };

  const handleLocalBlur = (field: string) => {
    setLocalValues((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validateForm = (): boolean => {
    try {
      mlSettingsSchema.parse(formData);
      setErrors({});
      return true;
    } catch (e) {
      if (e instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        e.errors.forEach((err) => { if (err.path[0]) newErrors[err.path[0] as string] = err.message; });
        setErrors(newErrors);
      }
      return false;
    }
  };

  // ── Save / Delete ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user || !validateForm()) return;
    setIsSaving(true);

    try {
      if (formData.is_default && settings.some((s) => s.is_default && s.id !== selectedSettings?.id)) {
        await supabase.from('ml_settings').update({ is_default: false }).eq('user_id', user.id);
      }

      if (isCreating) {
        const { data, error } = await supabase
          .from('ml_settings')
          .insert({ user_id: user.id, ...formData })
          .select()
          .single();

        if (error) throw error;
        toast.success('Configuração criada com sucesso!');
        await fetchSettings();
        if (data) selectSettings(data as MLSettingsData);
      } else if (selectedSettings) {
        const { error } = await supabase
          .from('ml_settings')
          .update(formData)
          .eq('id', selectedSettings.id);

        if (error) throw error;
        toast.success('Configuração salva com sucesso!');
        await fetchSettings();
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro ao salvar configuração';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSettings || !user) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('ml_settings')
        .delete()
        .eq('id', selectedSettings.id);

      if (error) throw error;
      toast.success('Configuração excluída com sucesso!');
      await fetchSettings();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro ao excluir';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Field helper ──────────────────────────────────────────────────────────
  const PercentField = ({
    id, label, field, description,
  }: { id: string; label: string; field: keyof typeof formData; description: string }) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          value={getLocalValue(field, formData[field] as number, true)}
          onChange={(e) => handleLocalChange(field, e.target.value, true)}
          onBlur={() => handleLocalBlur(field)}
          placeholder="0"
          className={`pr-8 ${errors[field] ? 'border-destructive' : ''}`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      {errors[field] && <p className="text-xs text-destructive">{errors[field]}</p>}
    </div>
  );

  const CurrencyField = ({
    id, label, field, description,
  }: { id: string; label: string; field: keyof typeof formData; description: string }) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          value={getLocalValue(field, formData[field] as number, false)}
          onChange={(e) => handleLocalChange(field, e.target.value, false)}
          onBlur={() => handleLocalBlur(field)}
          placeholder="0,00"
          className={`pl-10 ${errors[field] ? 'border-destructive' : ''}`}
        />
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      {errors[field] && <p className="text-xs text-destructive">{errors[field]}</p>}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Configurações Financeiras</h2>
          <p className="text-muted-foreground">
            Defina os parâmetros de cálculo para suas vendas no Mercado Livre
          </p>
        </div>
        <Button onClick={handleNewSettings}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Configuração
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Settings List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Configurações Salvas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {settings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma configuração salva
              </p>
            ) : (
              settings.map((setting) => (
                <button
                  key={setting.id}
                  onClick={() => selectSettings(setting)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedSettings?.id === setting.id
                      ? 'border-primary bg-muted'
                      : 'border-transparent hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm truncate">{setting.name}</span>
                  </div>
                  {setting.is_default && (
                    <span className="text-xs text-primary">Padrão</span>
                  )}
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Settings Form */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>
              {isCreating ? 'Nova Configuração' : `Editar: ${selectedSettings?.name}`}
            </CardTitle>
            <CardDescription>
              Configure as taxas e parâmetros que serão usados nos cálculos do Mercado Livre
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Name & Default */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Configuração</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ex: Padrão Mercado Livre"
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="flex items-center space-x-3 pt-6">
                <Switch
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => handleInputChange('is_default', checked)}
                />
                <Label htmlFor="is_default">Definir como padrão</Label>
              </div>
            </div>

            <Separator />

            {/* ML Fees */}
            <div>
              <h3 className="font-semibold mb-4 text-foreground">Taxas do Mercado Livre</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <PercentField
                  id="taxa_comissao_ml"
                  label="Taxa de Comissão ML (%)"
                  field="taxa_comissao_ml"
                  description="Percentual cobrado pelo ML sobre o valor vendido"
                />
                <PercentField
                  id="taxa_afiliado"
                  label="Taxa de Afiliado (%)"
                  field="taxa_afiliado"
                  description="Comissão paga a afiliados (se aplicável)"
                />
                <CurrencyField
                  id="adicional_por_item"
                  label="Adicional por Item (R$)"
                  field="adicional_por_item"
                  description="Valor fixo adicional cobrado por item"
                />
              </div>
            </div>

            <Separator />

            {/* Anticipation */}
            <div>
              <h3 className="font-semibold mb-4 text-foreground">Antecipação</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <PercentField
                  id="percentual_valor_antecipado"
                  label="% do Valor Antecipado"
                  field="percentual_valor_antecipado"
                  description="Percentual do valor que é antecipado"
                />
                <PercentField
                  id="taxa_antecipacao"
                  label="Taxa de Antecipação (%)"
                  field="taxa_antecipacao"
                  description="Taxa cobrada sobre o valor antecipado"
                />
              </div>
            </div>

            <Separator />

            {/* Taxes */}
            <div>
              <h3 className="font-semibold mb-4 text-foreground">Impostos e Notas Fiscais</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <PercentField
                  id="imposto_nf_saida"
                  label="Imposto NF Saída (%)"
                  field="imposto_nf_saida"
                  description="Imposto sobre NF de saída"
                />
                <PercentField
                  id="percentual_nf_entrada"
                  label="% NF Entrada"
                  field="percentual_nf_entrada"
                  description="% do custo para NF entrada"
                />
                <PercentField
                  id="desconto_nf_saida"
                  label="Desconto NF Saída (%)"
                  field="desconto_nf_saida"
                  description="Desconto aplicado antes do imposto"
                />
              </div>
            </div>

            <Separator />

            {/* ML Ads */}
            <div>
              <h3 className="font-semibold mb-4 text-foreground">Mercado Livre Ads (Opcional)</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <CurrencyField
                  id="gasto_ml_ads"
                  label="Gasto Total com Ads (R$)"
                  field="gasto_ml_ads"
                  description="Valor total gasto com anúncios no período. Será descontado do lucro total."
                />
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
                      <AlertDialogTitle>Excluir configuração?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. A configuração "{selectedSettings.name}"
                        será permanentemente excluída.
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
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Excluindo...</>
                        ) : 'Excluir'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button onClick={handleSave} disabled={isSaving} className="sm:order-2">
                {isSaving
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <Save className="h-4 w-4 mr-2" />}
                {isCreating ? 'Criar Configuração' : 'Salvar Alterações'}
              </Button>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function MercadoLivreConfiguracoes() {
  return (
    <ProtectedRoute>
      <AppLayout title="Gestão Mercado Livre">
        <InPageNav tabs={mercadolivreNavTabs} />
        <ConfiguracoesContent />
      </AppLayout>
    </ProtectedRoute>
  );
}