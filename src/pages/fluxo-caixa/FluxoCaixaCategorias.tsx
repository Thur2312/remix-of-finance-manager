import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCashFlowCategories, type CashFlowCategory } from '@/hooks/useCashFlow';
import { Plus, Trash2, Edit, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion } from 'framer-motion';

const PRESET_COLORS = [
  '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', 
  '#F59E0B', '#EF4444', '#14B8A6', '#6366F1',
  '#F97316', '#84CC16', '#06B6D4', '#6B7280',
];

function FluxoCaixaCategoriasContent() {
  const { categories, isLoading, createCategory, updateCategory, deleteCategory } = useCashFlowCategories();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CashFlowCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CashFlowCategory | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    color: PRESET_COLORS[0],
    icon: 'circle',
  });

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const handleOpenDialog = (category?: CashFlowCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        type: category.type,
        color: category.color,
        icon: category.icon,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        type: 'expense',
        color: PRESET_COLORS[0],
        icon: 'circle',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    if (editingCategory) {
      await updateCategory.mutateAsync({
        id: editingCategory.id,
        name: formData.name,
        type: formData.type,
        color: formData.color,
        icon: formData.icon,
      });
    } else {
      await createCategory.mutateAsync({
        name: formData.name,
        type: formData.type,
        color: formData.color,
        icon: formData.icon,
        is_default: false,
      });
    }

    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deletingCategory) {
      await deleteCategory.mutateAsync(deletingCategory.id);
      setDeletingCategory(null);
    }
  };

  const CategoryCard = ({ category }: { category: CashFlowCategory }) => (
    <motion.div 
      className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-center gap-3">
        <div 
          className="w-4 h-4 rounded-full" 
          style={{ backgroundColor: category.color }}
        />
        <span className="font-medium text-gray-900">{category.name}</span>
        {category.is_default && (
          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-200">Padrão</Badge>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleOpenDialog(category)}
          className="hover:bg-blue-100 text-blue-600"
        >
          <Edit className="h-4 w-4" />
        </Button>
        {!category.is_default && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeletingCategory(category)}
            className="hover:bg-red-50 text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </motion.div>
  );

  return (
    <AppLayout>
      <motion.div 
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Categorias</h1>
            <p className="text-gray-600">
              Gerencie as categorias de entradas e saídas
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Nova Categoria
          </Button>
        </motion.div>

        <motion.div 
          className="grid gap-6 md:grid-cols-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Income Categories */}
          <Card className="border border-blue-200 shadow-lg bg-white">
            <CardHeader className="bg-blue-50 border-b border-blue-200">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Categorias de Entrada
              </CardTitle>
              <CardDescription className="text-gray-600">
                Categorias para receitas e recebimentos
              </CardDescription>
            </CardHeader>
            <br />
            <CardContent className="space-y-3">
              {isLoading ? (
                <>
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </>
              ) : incomeCategories.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Nenhuma categoria de entrada
                </p>
              ) : (
                incomeCategories.map(category => (
                  <CategoryCard key={category.id} category={category} />
                ))
              )}
            </CardContent>
          </Card>

          {/* Expense Categories */}
          <Card className="border border-blue-200 shadow-lg bg-white">
            <CardHeader className="bg-blue-50 border-b border-blue-200">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <TrendingDown className="h-5 w-5 text-red-600" />
                Categorias de Saída
              </CardTitle>
              <CardDescription className="text-gray-600">
                Categorias para despesas e pagamentos
              </CardDescription>
            </CardHeader>
            <br />
            <CardContent className="space-y-3">
              {isLoading ? (
                <>
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </>
              ) : expenseCategories.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Nenhuma categoria de saída
                </p>
              ) : (
                expenseCategories.map(category => (
                  <CategoryCard key={category.id} category={category} />
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="border border-blue-200 bg-white">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <DialogHeader className="bg-blue-50 border-b border-blue-200 -m-6 mb-0 p-6 rounded-t-lg">
              <DialogTitle className="text-gray-900">
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 p-6">
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <Label htmlFor="name" className="text-gray-900">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Fornecedores"
                  className="border-blue-200 focus:border-blue-500"
                />
              </motion.div>

              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <Label className="text-gray-900">Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'income' | 'expense') => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="border-blue-200 focus:border-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Entrada</SelectItem>
                    <SelectItem value="expense">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </motion.div>

              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <Label className="text-gray-900">Cor</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color, index) => (
                    <motion.button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.color === color ? 'border-blue-600 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ scale: 1.1 }}
                    />
                  ))}
                </div>
              </motion.div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 -m-6 mt-0 p-6 bg-blue-50 border-t border-blue-200 rounded-b-lg">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-blue-200 text-blue-700 hover:bg-blue-50">
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!formData.name.trim() || createCategory.isPending || updateCategory.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {editingCategory ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent className="border border-blue-200 bg-white">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle className="text-gray-900">Excluir categoria?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600">
                Tem certeza que deseja excluir a categoria "{deletingCategory?.name}"?
                Os lançamentos desta categoria ficarão sem categoria.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-blue-200 text-blue-700 hover:bg-blue-50">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </motion.div>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

export default function FluxoCaixaCategorias() {
  return (
    <ProtectedRoute>
      <FluxoCaixaCategoriasContent />
    </ProtectedRoute>
  );
}