import { useState } from 'react';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
  Check, ChevronsUpDown, Plus, Pencil, Trash2,
  FolderOpen, Building2, Laptop, Megaphone, CreditCard,
  Receipt, Truck, Package, ShoppingBag, Users, Wrench, Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { COST_CATEGORIES } from '@/hooks/useFixedCosts';
import { CustomCategory, ICON_OPTIONS, useCustomCategories } from '../hooks/useCustomCategories';
import { toast } from 'sonner';

// ── Mapa de ícones ────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ReactNode> = {
  FolderOpen: <FolderOpen className="h-4 w-4" />,
  Building2: <Building2 className="h-4 w-4" />,
  Laptop: <Laptop className="h-4 w-4" />,
  Megaphone: <Megaphone className="h-4 w-4" />,
  CreditCard: <CreditCard className="h-4 w-4" />,
  Receipt: <Receipt className="h-4 w-4" />,
  Truck: <Truck className="h-4 w-4" />,
  Package: <Package className="h-4 w-4" />,
  ShoppingBag: <ShoppingBag className="h-4 w-4" />,
  Users: <Users className="h-4 w-4" />,
  Wrench: <Wrench className="h-4 w-4" />,
  Globe: <Globe className="h-4 w-4" />,
};

const DEFAULT_ICON_MAP: Record<string, React.ReactNode> = {
  'Estrutura Administrativa': <Building2 className="h-4 w-4" />,
  'Infraestrutura & Operação': <Building2 className="h-4 w-4" />,
  'Tecnologia & Ferramentas': <Laptop className="h-4 w-4" />,
  'Marketing Fixo': <Megaphone className="h-4 w-4" />,
  'Financeiro & Bancário': <CreditCard className="h-4 w-4" />,
  'Tributação Fixa': <Receipt className="h-4 w-4" />,
  'Logística Estrutural': <Truck className="h-4 w-4" />,
  'Despesas Recorrentes Diversas': <FolderOpen className="h-4 w-4" />,
};

// ── Sub-form: criar / editar categoria ───────────────────────────────────────
interface CategoryFormProps {
  initial?: { name: string; icon: string };
  onSave: (name: string, icon: string) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

function CategoryForm({ initial, onSave, onCancel, loading }: CategoryFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? 'FolderOpen');

  return (
    <div className="space-y-3 pt-1">
      <div className="space-y-1.5">
        <Label className="text-xs">Nome da categoria *</Label>
        <Input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ex: Embalagens, Contador..."
          maxLength={60}
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Ícone</Label>
        <div className="grid grid-cols-6 gap-1.5">
          {ICON_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              title={opt.label}
              onClick={() => setIcon(opt.value)}
              className={cn(
                'flex items-center justify-center h-8 w-8 rounded-md border transition-colors',
                icon === opt.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-transparent hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground'
              )}
            >
              {ICON_MAP[opt.value]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          className="flex-1 h-8 text-xs"
          disabled={!name.trim() || loading}
          onClick={() => onSave(name, icon)}
        >
          {loading ? 'Salvando...' : initial ? 'Salvar' : 'Criar categoria'}
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function CategorySelect({ value, onChange }: CategorySelectProps) {
  const { customCategories, addCategory, updateCategory, deleteCategory } = useCustomCategories();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'list' | 'new' | 'edit'>('list');
  const [editingCat, setEditingCat] = useState<CustomCategory | null>(null);
  const [deletingCat, setDeletingCat] = useState<CustomCategory | null>(null);
  const [saving, setSaving] = useState(false);

  // Label exibida no trigger
  const selectedLabel = value || 'Selecione uma categoria';

  // Ícone exibido no trigger
  const triggerIcon = (() => {
    const custom = customCategories.find(c => c.name === value);
    if (custom) return ICON_MAP[custom.icon] ?? <FolderOpen className="h-4 w-4" />;
    return DEFAULT_ICON_MAP[value] ?? null;
  })();

  const handleSelect = (name: string) => {
    onChange(name);
    setOpen(false);
    setMode('list');
  };

  const handleNew = async (name: string, icon: string) => {
    setSaving(true);
    const ok = await addCategory(name, icon);
    setSaving(false);
    if (ok) {
      onChange(name);
      setMode('list');
      setOpen(false);
    }
  };

  const handleEdit = async (name: string, icon: string) => {
    if (!editingCat) return;
    setSaving(true);
    const ok = await updateCategory(editingCat.id, name, icon);
    setSaving(false);
    if (ok) {
      // se estava selecionada, atualiza o valor
      if (value === editingCat.name) onChange(name);
      setMode('list');
      setEditingCat(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingCat) return;
    const ok = await deleteCategory(deletingCat.id, deletingCat.name);
    if (ok && value === deletingCat.name) onChange('');
    setDeletingCat(null);
  };

  return (
    <>
      <Popover open={open} onOpenChange={o => { setOpen(o); if (!o) setMode('list'); }}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal h-10"
          >
            <span className="flex items-center gap-2 truncate">
              {triggerIcon}
              <span className={cn('truncate', !value && 'text-muted-foreground')}>
                {selectedLabel}
              </span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-72 p-0"
          align="start"
          onOpenAutoFocus={e => e.preventDefault()}
        >
          {mode === 'list' && (
            <div className="flex flex-col">
              {/* Grupo: Padrão */}
              <div className="px-2 pt-2 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-1">
                  Padrão
                </p>
                {COST_CATEGORIES.map(cat => (
                  <button
                    key={cat.name}
                    onClick={() => handleSelect(cat.name)}
                    className={cn(
                      'flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm transition-colors text-left',
                      value === cat.name
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted text-foreground'
                    )}
                  >
                    <span className="text-muted-foreground shrink-0">
                      {DEFAULT_ICON_MAP[cat.name]}
                    </span>
                    <span className="truncate flex-1">{cat.name}</span>
                    {value === cat.name && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                ))}
              </div>

              {/* Grupo: Minhas categorias */}
              <div className="border-t px-2 pt-2 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-1">
                  Minhas categorias
                </p>

                {customCategories.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-2 py-1.5 italic">
                    Nenhuma categoria criada ainda
                  </p>
                ) : (
                  customCategories.map(cat => (
                    <div
                      key={cat.id}
                      className={cn(
                        'flex items-center gap-2 w-full rounded-md px-2 py-1 text-sm transition-colors group',
                        value === cat.name ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                      )}
                    >
                      <button
                        className="flex items-center gap-2 flex-1 text-left min-w-0"
                        onClick={() => handleSelect(cat.name)}
                      >
                        <span className="text-muted-foreground shrink-0">
                          {ICON_MAP[cat.icon] ?? <FolderOpen className="h-4 w-4" />}
                        </span>
                        <span className="truncate">{cat.name}</span>
                        {value === cat.name && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </button>

                      {/* Ações visíveis no hover */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          title="Editar"
                          onClick={e => {
                            e.stopPropagation();
                            setEditingCat(cat);
                            setMode('edit');
                          }}
                          className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted-foreground/15 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          title="Excluir"
                          onClick={e => {
                            e.stopPropagation();
                            setDeletingCat(cat);
                          }}
                          className="h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Botão Nova categoria */}
              <div className="border-t p-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full justify-start gap-2 h-8 text-xs text-primary hover:text-primary hover:bg-primary/10"
                  onClick={() => setMode('new')}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nova categoria
                </Button>
              </div>
            </div>
          )}

          {/* Form: criar */}
          {mode === 'new' && (
            <div className="p-3">
              <p className="text-sm font-medium mb-2">Nova categoria</p>
              <CategoryForm
                onSave={handleNew}
                onCancel={() => setMode('list')}
                loading={saving}
              />
            </div>
          )}

          {/* Form: editar */}
          {mode === 'edit' && editingCat && (
            <div className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-medium flex-1">Editar categoria</p>
                <Badge variant="secondary" className="text-[10px]">Sua categoria</Badge>
              </div>
              <CategoryForm
                initial={{ name: editingCat.name, icon: editingCat.icon }}
                onSave={handleEdit}
                onCancel={() => { setMode('list'); setEditingCat(null); }}
                loading={saving}
              />
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deletingCat} onOpenChange={o => { if (!o) setDeletingCat(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              A categoria <strong>"{deletingCat?.name}"</strong> será excluída permanentemente. Só é possível excluir se não houver custos cadastrados nela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}