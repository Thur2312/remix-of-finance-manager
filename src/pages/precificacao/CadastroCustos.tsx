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
import { motion } from 'framer-motion';

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
    return (
      <AppLayout>
        <motion.div 
          className="container mx-auto px-4 py-6 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-64" />
        </motion.div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <motion.div 
        className="container mx-auto px-4 py-6 space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <motion.div 
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cadastro de Custos Fixos</h1>
            <p className="text-gray-600">Gerencie os custos fixos mensais da sua operação</p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={open => {
            setIsAddDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Custo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md border border-blue-200 bg-white">
              <DialogHeader>
                <DialogTitle className="text-gray-900">{editingCost ? 'Editar Custo' : 'Adicionar Custo Fixo'}</DialogTitle>
                <DialogDescription className="text-gray-600">
                  {editingCost ? 'Altere as informações do custo fixo' : 'Preencha as informações do novo custo fixo'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-gray-900">Categoria *</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger className="border-blue-200 focus:border-blue-500">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {COST_CATEGORIES.map(cat => (
                        <SelectItem key={cat.name} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formCategory && (
                    <p className="text-xs text-gray-500">
                      Exemplos: {COST_CATEGORIES.find(c => c.name === formCategory)?.examples.slice(0, 3).join(', ')}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-900">Nome do Custo *</Label>
                  <Input 
                    id="name" 
                    value={formName} 
                    onChange={e => setFormName(e.target.value)} 
                    placeholder="Ex: Pró-labore, ERP Bling..." 
                    maxLength={100} 
                    className="border-blue-200 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-gray-900">Valor Mensal (R$) *</Label>
                  <Input 
                    id="amount" 
                    type="text" 
                    inputMode="decimal" 
                    value={formAmount} 
                    onChange={e => setFormAmount(e.target.value)} 
                    placeholder="0,00" 
                    className="border-blue-200 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="recurring" className="text-gray-900">Este custo ocorre todo mês?</Label>
                    <p className="text-xs text-gray-500">Custos recorrentes são incluídos no cálculo automático</p>
                  </div>
                  <Switch id="recurring" checked={formIsRecurring} onCheckedChange={setFormIsRecurring} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-gray-900">Observações (opcional)</Label>
                  <Textarea 
                    id="notes" 
                    value={formNotes} 
                    onChange={e => setFormNotes(e.target.value)} 
                    placeholder="Notas adicionais sobre este custo..." 
                    rows={2} 
                    maxLength={500} 
                    className="border-blue-200 focus:border-blue-500"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsAddDialogOpen(false);
                  resetForm();
                }} className="border-blue-200 text-blue-700 hover:bg-blue-50">
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={!formCategory || !formName || !formAmount} className="bg-blue-600 hover:bg-blue-700">
                  {editingCost ? 'Salvar Alterações' : 'Adicionar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Dashboard Cards */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="border border-blue-200 shadow-lg bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-900">Custo Fixo Mensal Total</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalRecurringCosts)}</div>
              <p className="text-xs text-gray-500">
                {costs.filter(c => c.is_recurring).length} custos recorrentes
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Costs by Category */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card className="border border-blue-200 shadow-lg bg-white">
            <CardHeader className="bg-blue-50 border-b border-blue-200">
              <CardTitle className="text-lg text-gray-900">Custos Cadastrados</CardTitle>
              <CardDescription className="text-gray-600">
                {costs.length} custo{costs.length !== 1 ? 's' : ''} cadastrado{costs.length !== 1 ? 's' : ''} em {Object.keys(costsByCategory).length} categoria{Object.keys(costsByCategory).length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {costs.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum custo cadastrado ainda.</p>
                  <p className="text-sm">Clique em "Adicionar Custo" para começar.</p>
                </div>
              ) : (
                <Accordion type="multiple" className="w-full" defaultValue={Object.keys(costsByCategory)}>
                  {COST_CATEGORIES.filter(cat => costsByCategory[cat.name]?.length > 0).map(category => {
                    const categoryCosts = costsByCategory[category.name] || [];
                    const categoryTotal = categoryCosts.reduce((sum, c) => sum + Number(c.amount), 0);
                    return (
                      <AccordionItem key={category.name} value={category.name}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(category.name)}
                              <span className="text-gray-900">{category.name}</span>
                              <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 border-blue-200">{categoryCosts.length}</Badge>
                            </div>
                            <span className="font-semibold text-blue-600">{formatCurrency(categoryTotal)}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pl-6">
                            {categoryCosts.map(cost => (
                              <motion.div 
                                key={cost.id} 
                                className="flex items-center justify-between py-2 px-3 bg-blue-50 rounded-md"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.4 }}
                              >
                                <div className="flex items-center gap-3">
                                  <div>
                                    <p className="font-medium text-sm text-gray-900">{cost.name}</p>
                                    {cost.notes && <p className="text-xs text-gray-600">{cost.notes}</p>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <p className="font-semibold text-gray-900">{formatCurrency(cost.amount)}</p>
                                    {cost.is_recurring && (
                                      <Badge variant="outline" className="text-xs border-blue-200 text-blue-700">
                                        <RefreshCw className="h-3 w-3 mr-1" />
                                        Recorrente
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-50 text-blue-600" onClick={() => openEditDialog(cost)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50">
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="border border-blue-200 bg-white">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle className="text-gray-900">Excluir custo?</AlertDialogTitle>
                                          <AlertDialogDescription className="text-gray-600">
                                            Tem certeza que deseja excluir "{cost.name}"? Esta ação não pode ser desfeita.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel className="border-blue-200 text-blue-700 hover:bg-blue-50">Cancelar</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => deleteCost(cost.id)} className="bg-red-500 hover:bg-red-600 text-white">
                                            Excluir
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}

export default function CadastroCustos() {
  return (
    <ProtectedRoute>
      <CadastroCustosContent />
    </ProtectedRoute>
  );
}