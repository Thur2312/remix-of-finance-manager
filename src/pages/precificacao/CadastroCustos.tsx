import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFixedCosts, COST_CATEGORIES, FixedCost } from '@/hooks/useFixedCosts';
import { parseCurrencyInput, parseNumericInputSafe } from '@/lib/numeric-validation';
import { toast } from 'sonner';
import { DollarSign, Package, ShoppingBag, Percent, Plus, Pencil, Trash2, RefreshCw, Lightbulb, Building2, Laptop, Megaphone, CreditCard, Receipt, Truck, FolderOpen } from 'lucide-react';
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};
const getCategoryIcon = (category: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    "Estrutura Administrativa": <Building2 className="h-4 w-4" />,
    "Infraestrutura & Operação": <Building2 className="h-4 w-4" />,
    "Tecnologia & Ferramentas": <Laptop className="h-4 w-4" />,
    "Marketing Fixo": <Megaphone className="h-4 w-4" />,
    "Financeiro & Bancário": <CreditCard className="h-4 w-4" />,
    "Tributação Fixa": <Receipt className="h-4 w-4" />,
    "Logística Estrutural": <Truck className="h-4 w-4" />,
    "Despesas Recorrentes Diversas": <FolderOpen className="h-4 w-4" />
  };
  return iconMap[category] || <FolderOpen className="h-4 w-4" />;
};
function CadastroCustosContent() {
  const {
    costs,
    settings,
    isLoading,
    addCost,
    updateCost,
    deleteCost,
    updateSettings,
    totalRecurringCosts,
    costPerOrder,
    costPerProduct,
    costPercentage,
    costsByCategory
  } = useFixedCosts();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<FixedCost | null>(null);

  // Form state
  const [formCategory, setFormCategory] = useState('');
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formIsRecurring, setFormIsRecurring] = useState(true);
  const [formNotes, setFormNotes] = useState('');
  const resetForm = () => {
    setFormCategory('');
    setFormName('');
    setFormAmount('');
    setFormIsRecurring(true);
    setFormNotes('');
    setEditingCost(null);
  };
  const openEditDialog = (cost: FixedCost) => {
    setEditingCost(cost);
    setFormCategory(cost.category);
    setFormName(cost.name);
    setFormAmount(cost.amount.toString());
    setFormIsRecurring(cost.is_recurring);
    setFormNotes(cost.notes || '');
    setIsAddDialogOpen(true);
  };
  const handleSubmit = async () => {
    const parseResult = parseCurrencyInput(formAmount);
    if (!parseResult.isValid) {
      toast.error(parseResult.error || 'Valor inválido');
      return;
    }
    if (!formCategory || !formName) return;
    const amount = parseResult.value;
    const costData = {
      category: formCategory,
      name: formName.trim(),
      amount,
      is_recurring: formIsRecurring,
      notes: formNotes.trim() || null
    };
    let success: boolean;
    if (editingCost) {
      success = await updateCost(editingCost.id, costData);
    } else {
      success = await addCost(costData);
    }
    if (success) {
      setIsAddDialogOpen(false);
      resetForm();
    }
  };
  const handleSettingsChange = (field: 'monthly_orders' | 'monthly_products_sold' | 'monthly_revenue', value: string) => {
    const numValue = parseNumericInputSafe(value, { min: 0, max: 9999999 });
    updateSettings({
      [field]: numValue
    });
  };
  if (isLoading) {
    return <AppLayout>
        <div className="container mx-auto px-4 py-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      </AppLayout>;
  }
  return <AppLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cadastro de Custos Fixos</h1>
            <p className="text-muted-foreground">Gerencie os custos fixos mensais da sua operação</p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={open => {
          setIsAddDialogOpen(open);
          if (!open) resetForm();
        }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Custo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingCost ? 'Editar Custo' : 'Adicionar Custo Fixo'}</DialogTitle>
                <DialogDescription>
                  {editingCost ? 'Altere as informações do custo fixo' : 'Preencha as informações do novo custo fixo'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria *</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {COST_CATEGORIES.map(cat => <SelectItem key={cat.name} value={cat.name}>
                          {cat.name}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                  {formCategory && <p className="text-xs text-muted-foreground">
                      Exemplos: {COST_CATEGORIES.find(c => c.name === formCategory)?.examples.slice(0, 3).join(', ')}
                    </p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Custo *</Label>
                  <Input id="name" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ex: Pró-labore, ERP Bling..." maxLength={100} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Valor Mensal (R$) *</Label>
                  <Input id="amount" type="text" inputMode="decimal" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="0,00" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="recurring">Este custo ocorre todo mês?</Label>
                    <p className="text-xs text-muted-foreground">Custos recorrentes são incluídos no cálculo automático</p>
                  </div>
                  <Switch id="recurring" checked={formIsRecurring} onCheckedChange={setFormIsRecurring} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Textarea id="notes" value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Notas adicionais sobre este custo..." rows={2} maxLength={500} />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => {
                setIsAddDialogOpen(false);
                resetForm();
              }}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={!formCategory || !formName || !formAmount}>
                  {editingCost ? 'Salvar Alterações' : 'Adicionar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custo Fixo Mensal Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRecurringCosts)}</div>
              <p className="text-xs text-muted-foreground">
                {costs.filter(c => c.is_recurring).length} custos recorrentes
              </p>
            </CardContent>
          </Card>

          
        </div>

        {/* Costs by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Custos Cadastrados</CardTitle>
            <CardDescription>
              {costs.length} custo{costs.length !== 1 ? 's' : ''} cadastrado{costs.length !== 1 ? 's' : ''} em {Object.keys(costsByCategory).length} categoria{Object.keys(costsByCategory).length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {costs.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum custo cadastrado ainda.</p>
                <p className="text-sm">Clique em "Adicionar Custo" para começar.</p>
              </div> : <Accordion type="multiple" className="w-full" defaultValue={Object.keys(costsByCategory)}>
                {COST_CATEGORIES.filter(cat => costsByCategory[cat.name]?.length > 0).map(category => {
              const categoryCosts = costsByCategory[category.name] || [];
              const categoryTotal = categoryCosts.reduce((sum, c) => sum + Number(c.amount), 0);
              return <AccordionItem key={category.name} value={category.name}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(category.name)}
                            <span>{category.name}</span>
                            <Badge variant="secondary" className="ml-2">{categoryCosts.length}</Badge>
                          </div>
                          <span className="font-semibold text-primary">{formatCurrency(categoryTotal)}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pl-6">
                          {categoryCosts.map(cost => <div key={cost.id} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md">
                              <div className="flex items-center gap-3">
                                <div>
                                  <p className="font-medium text-sm">{cost.name}</p>
                                  {cost.notes && <p className="text-xs text-muted-foreground">{cost.notes}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="font-semibold">{formatCurrency(cost.amount)}</p>
                                  {cost.is_recurring && <Badge variant="outline" className="text-xs">
                                      <RefreshCw className="h-3 w-3 mr-1" />
                                      Recorrente
                                    </Badge>}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(cost)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Excluir custo?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tem certeza que deseja excluir "{cost.name}"? Esta ação não pode ser desfeita.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteCost(cost.id)}>
                                          Excluir
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            </div>)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>;
            })}
              </Accordion>}
          </CardContent>
        </Card>
      </div>
    </AppLayout>;
}

export default function CadastroCustos() {
  return (
    <ProtectedRoute>
      <CadastroCustosContent />
    </ProtectedRoute>
  );
}