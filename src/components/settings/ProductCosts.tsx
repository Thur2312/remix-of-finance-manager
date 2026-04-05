import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Package, Loader2, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';
import { useShopeeSync } from '@/hooks/useShopeeSync';
import { useIntegrations } from '@/hooks/useIntegrations';

interface ProductCost {
  id: string;
  user_id: string;
  sku: string | null;
  external_item_id: string | null;
  item_name: string | null;
  cost: number;
  packaging_cost: number;
  other_costs: number;
  tax_percent: number;
  notes: string | null;
}

interface ProductOption {
  external_item_id: string;
  item_name: string;
  sku: string;
  totalOrders: number;
  totalRevenue: number;
}

export function ProductCosts() {
  const { user } = useAuth();
  const [costs, setCosts] = useState<ProductCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCost, setNewCost] = useState({
    external_item_id: '',
    item_name: '',
    sku: '',
    cost: '',
    packaging_cost: '',
    other_costs: '',
    tax_percent: '',
    notes: '',
  });

  const { getConnection } = useIntegrations();
  const shopeeConnection = getConnection('shopee');
  const isConnected = shopeeConnection?.status === 'connected';
  const { data: syncData } = useShopeeSync(
    isConnected ? shopeeConnection!.id : null,
    60
  );

  // Produtos únicos da sync
  const productOptions: ProductOption[] = syncData
    ? Array.from(
        syncData.orders.reduce((map, order) => {
          const item = order.order_items?.[0];
          if (!item?.external_item_id) return map;
          const existing = map.get(item.external_item_id);
          if (!existing) {
            map.set(item.external_item_id, {
              external_item_id: item.external_item_id,
              item_name: item.item_name,
              sku: item.sku,
              totalOrders: 1,
              totalRevenue: Number(order.total_amount),
            });
          } else {
            existing.totalOrders += 1;
            existing.totalRevenue += Number(order.total_amount);
          }
          return map;
        }, new Map<string, ProductOption>())
      ).map(([, v]) => v).sort((a, b) => b.totalRevenue - a.totalRevenue)
    : [];

  useEffect(() => {
    if (user) fetchCosts();
  }, [user]);

  const fetchCosts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('product_costs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('Erro ao carregar custos');
    else setCosts((data as unknown as ProductCost[]) || []);
    setIsLoading(false);
  };

  const handleSave = async (cost: ProductCost) => {
    setIsSaving(cost.id);
    const { error } = await supabase
      .from('product_costs')
      .update({
        cost: cost.cost,
        packaging_cost: cost.packaging_cost,
        other_costs: cost.other_costs,
        tax_percent: cost.tax_percent,
        notes: cost.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cost.id);
    if (error) toast.error('Erro ao salvar');
    else toast.success('Custo salvo!');
    setIsSaving(null);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('product_costs')
      .delete()
      .eq('id', id);
    if (error) toast.error('Erro ao excluir');
    else {
      toast.success('Removido!');
      setCosts(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleAdd = async () => {
    if (!user) return;
    if (!newCost.item_name && !newCost.sku) {
      toast.error('Informe o nome ou SKU do produto');
      return;
    }
    const { data, error } = await supabase
      .from('product_costs')
      .insert({
        user_id: user.id,
        external_item_id: newCost.external_item_id || null,
        item_name: newCost.item_name || null,
        sku: newCost.sku || null,
        cost: Number(newCost.cost) || 0,
        packaging_cost: Number(newCost.packaging_cost) || 0,
        other_costs: Number(newCost.other_costs) || 0,
        tax_percent: Number(newCost.tax_percent) || 0,
        notes: newCost.notes || null,
      })
      .select()
      .single();
    if (error) toast.error('Erro ao adicionar');
    else {
      toast.success('Produto adicionado!');
      setCosts(prev => [data as unknown as ProductCost, ...prev]);
      setShowAddForm(false);
      setNewCost({ external_item_id: '', item_name: '', sku: '', cost: '', packaging_cost: '', other_costs: '', tax_percent: '', notes: '' });
    }
  };

  const handleSelectProduct = (product: ProductOption) => {
    setNewCost(prev => ({
      ...prev,
      external_item_id: product.external_item_id,
      item_name: product.item_name,
      sku: product.sku,
    }));
  };

  const updateCost = (id: string, field: keyof ProductCost, value: string | number) => {
    setCosts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const filtered = costs.filter(c =>
    !search ||
    c.item_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const totalCost = (c: ProductCost) =>
    Number(c.cost) + Number(c.packaging_cost) + Number(c.other_costs);

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Custos por Produto
            </CardTitle>
            <CardDescription className="mt-1">
              Configure o custo de cada produto para calcular o lucro real
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Adicionar Produto
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">

        {/* Formulário de adição */}
        {showAddForm && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4 space-y-4">
              <p className="text-sm font-medium">Novo Produto</p>

              {/* Produtos da Shopee */}
              {productOptions.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Selecione um produto sincronizado ou preencha manualmente:
                  </Label>
                  <div className="grid gap-2 max-h-48 overflow-y-auto">
                    {productOptions
                      .filter(p => !costs.some(c => c.external_item_id === p.external_item_id))
                      .map(p => (
                        <button
                          key={p.external_item_id}
                          onClick={() => handleSelectProduct(p)}
                          className={`text-left p-2 rounded-lg border text-xs transition-colors ${
                            newCost.external_item_id === p.external_item_id
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:bg-muted/50'
                          }`}
                        >
                          <p className="font-medium truncate">{p.item_name}</p>
                          <p className="text-muted-foreground">SKU: {p.sku} · {p.totalOrders} pedidos · {formatCurrency(p.totalRevenue)}</p>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Nome do Produto</Label>
                  <Input
                    placeholder="Nome do produto"
                    value={newCost.item_name}
                    onChange={e => setNewCost(p => ({ ...p, item_name: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">SKU</Label>
                  <Input
                    placeholder="SKU"
                    value={newCost.sku}
                    onChange={e => setNewCost(p => ({ ...p, sku: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Custo (R$)</Label>
                  <Input
                    placeholder="0,00"
                    value={newCost.cost}
                    onChange={e => setNewCost(p => ({ ...p, cost: e.target.value }))}
                    className="h-8 text-sm"
                    type="number"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Embalagem (R$)</Label>
                  <Input
                    placeholder="0,00"
                    value={newCost.packaging_cost}
                    onChange={e => setNewCost(p => ({ ...p, packaging_cost: e.target.value }))}
                    className="h-8 text-sm"
                    type="number"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Outros (R$)</Label>
                  <Input
                    placeholder="0,00"
                    value={newCost.other_costs}
                    onChange={e => setNewCost(p => ({ ...p, other_costs: e.target.value }))}
                    className="h-8 text-sm"
                    type="number"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Imposto (%)</Label>
                  <Input
                    placeholder="0"
                    value={newCost.tax_percent}
                    onChange={e => setNewCost(p => ({ ...p, tax_percent: e.target.value }))}
                    className="h-8 text-sm"
                    type="number"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Observações</Label>
                  <Input
                    placeholder="Opcional"
                    value={newCost.notes}
                    onChange={e => setNewCost(p => ({ ...p, notes: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleAdd}>Adicionar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Busca */}
        {costs.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produto ou SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* Lista */}
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {costs.length === 0
              ? 'Nenhum produto cadastrado. Adicione para calcular o lucro real.'
              : 'Nenhum produto encontrado.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(cost => (
              <Card key={cost.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{cost.item_name || 'Produto sem nome'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {cost.sku && <Badge variant="outline" className="text-xs">{cost.sku}</Badge>}
                        <span className="text-xs text-muted-foreground">
                          Custo total: {formatCurrency(totalCost(cost))}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2"
                        onClick={() => handleSave(cost)}
                        disabled={isSaving === cost.id}
                      >
                        {isSaving === cost.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Save className="h-3 w-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(cost.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Custo Produto (R$)</Label>
                      <Input
                        type="number"
                        value={cost.cost}
                        onChange={e => updateCost(cost.id, 'cost', Number(e.target.value))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Embalagem (R$)</Label>
                      <Input
                        type="number"
                        value={cost.packaging_cost}
                        onChange={e => updateCost(cost.id, 'packaging_cost', Number(e.target.value))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Outros (R$)</Label>
                      <Input
                        type="number"
                        value={cost.other_costs}
                        onChange={e => updateCost(cost.id, 'other_costs', Number(e.target.value))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Imposto (%)</Label>
                      <Input
                        type="number"
                        value={cost.tax_percent}
                        onChange={e => updateCost(cost.id, 'tax_percent', Number(e.target.value))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}