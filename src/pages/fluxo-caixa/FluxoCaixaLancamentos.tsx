import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCashFlowCategories, useCashFlowEntries } from '@/hooks/useCashFlow';
import CashFlowEntryDialog from '@/components/fluxo-caixa/CashFlowEntryDialog';
import ImportBankStatementDialog from '@/components/fluxo-caixa/ImportBankStatementDialog';
import { Plus, Search, Download, CheckCircle, Trash2, Edit, Upload } from 'lucide-react';
import { format, parseISO } from 'date-fns';
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
import type { CashFlowEntry } from '@/hooks/useCashFlow';
import { motion } from 'framer-motion';

function FluxoCaixaLancamentosContent() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CashFlowEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<CashFlowEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { categories } = useCashFlowCategories();
  const { 
    entries, 
    isLoading, 
    deleteEntry: deleteEntryMutation, 
    updateEntryStatus 
  } = useCashFlowEntries({
    type: typeFilter !== 'all' ? typeFilter as 'income' | 'expense' : undefined,
    status: statusFilter !== 'all' ? statusFilter as 'pending' | 'paid' | 'received' : undefined,
    categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
  });

  const filteredEntries = entries.filter(entry =>
    entry.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusBadge = (status: string, type: string) => {
    const labels = {
      pending: 'Pendente',
      paid: 'Pago',
      received: 'Recebido',
    };

    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      pending: 'outline',
      paid: 'default',
      received: 'default',
    };

    return (
      <Badge variant={variants[status] || 'outline'} className="border-blue-200 text-blue-700 bg-blue-50">
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const handleMarkAsDone = (entry: CashFlowEntry) => {
    const newStatus = entry.type === 'income' ? 'received' : 'paid';
    updateEntryStatus.mutate({ id: entry.id, status: newStatus });
  };

  const handleEdit = (entry: CashFlowEntry) => {
    setEditingEntry(entry);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteEntry) {
      await deleteEntryMutation.mutateAsync(deleteEntry.id);
      setDeleteEntry(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'Status', 'Vencimento'];
    const rows = filteredEntries.map(entry => [
      format(parseISO(entry.date), 'dd/MM/yyyy'),
      entry.description,
      entry.category?.name || '-',
      entry.type === 'income' ? 'Entrada' : 'Saída',
      Number(entry.amount).toFixed(2),
      entry.status,
      entry.due_date ? format(parseISO(entry.due_date), 'dd/MM/yyyy') : '-',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lancamentos_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

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
            <h1 className="text-3xl font-bold text-gray-900">Lançamentos</h1>
            <p className="text-gray-600">
              Gerencie todas as entradas e saídas do seu fluxo de caixa
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} className="border-blue-200 text-blue-700 hover:bg-blue-50">
              <Upload className="h-4 w-4 mr-2" />
              Importar Extrato
            </Button>
            <Button variant="outline" onClick={handleExportCSV} className="border-blue-200 text-blue-700 hover:bg-blue-50">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => { setEditingEntry(null); setIsDialogOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Novo Lançamento
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="border border-blue-200 shadow-lg bg-white">
            <CardHeader className="bg-blue-50 border-b border-blue-200">
              <CardTitle className="text-9XL text-gray-900">Filtros</CardTitle>
            </CardHeader>
            <br />
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <Input
                    placeholder="Buscar por descrição..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 border-blue-200 focus:border-blue-500"
                  />
                </div>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="border-blue-200 focus:border-blue-500">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="income">Entradas</SelectItem>
                    <SelectItem value="expense">Saídas</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="border-blue-200 focus:border-blue-500">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="received">Recebido</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="border-blue-200 focus:border-blue-500">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card className="border border-blue-200 shadow-lg bg-white">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-600">Nenhum lançamento encontrado</p>
                  <Button className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => { setEditingEntry(null); setIsDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar primeiro lançamento
                  </Button>
                </div>
              ) : (
                <Table className="border border-blue-200 rounded-lg overflow-hidden">
                  <TableHeader className="bg-blue-50">
                    <TableRow>
                      <TableHead className="text-gray-900">Data</TableHead>
                      <TableHead className="text-gray-900">Descrição</TableHead>
                      <TableHead className="text-gray-900">Categoria</TableHead>
                      <TableHead className="text-gray-900">Tipo</TableHead>
                      <TableHead className="text-right text-gray-900">Valor</TableHead>
                      <TableHead className="text-gray-900">Status</TableHead>
                      <TableHead className="text-gray-900">Vencimento</TableHead>
                      <TableHead className="text-right text-gray-900">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry, index) => (
                      <motion.tr 
                        key={entry.id}
                        className="border-b border-blue-200 hover:bg-blue-25"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: index * 0.05 }}
                      >
                        <TableCell className="text-gray-900">{format(parseISO(entry.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="font-medium text-gray-900">{entry.description}</TableCell>
                        <TableCell>
                          {entry.category && (
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: entry.category.color }}
                              />
                              <span className="text-sm text-gray-900">{entry.category.name}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={entry.type === 'income' ? 'default' : 'destructive'} className={entry.type === 'income' ? 'bg-green-600 text-white' : 'bg-red-500 text-white'}>
                            {entry.type === 'income' ? 'Entrada' : 'Saída'}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${
                          entry.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {entry.type === 'expense' ? '-' : '+'}{formatCurrency(Number(entry.amount))}
                        </TableCell>
                        <TableCell>{getStatusBadge(entry.status, entry.type)}</TableCell>
                        <TableCell className="text-gray-900">
                          {entry.due_date ? format(parseISO(entry.due_date), 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {entry.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleMarkAsDone(entry)}
                                title={entry.type === 'income' ? 'Marcar como recebido' : 'Marcar como pago'}
                                className="hover:bg-green-50 text-green-600"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(entry)}
                              className="hover:bg-blue-50 text-blue-600"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteEntry(entry)}
                              className="hover:bg-red-50 text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <CashFlowEntryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        entry={editingEntry}
      />

      <ImportBankStatementDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
      />

      <AlertDialog open={!!deleteEntry} onOpenChange={() => setDeleteEntry(null)}>
        <AlertDialogContent className="border border-blue-200 bg-white">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <AlertDialogHeader>
              <AlertDialogTitle className="text-gray-900">Excluir lançamento?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600">
                Tem certeza que deseja excluir o lançamento "{deleteEntry?.description}"?
                Esta ação não pode ser desfeita.
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

export default function FluxoCaixaLancamentos() {
  return (
    <ProtectedRoute>
      <FluxoCaixaLancamentosContent />
    </ProtectedRoute>
  );
}