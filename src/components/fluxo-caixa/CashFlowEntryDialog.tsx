import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useCashFlowCategories, useCashFlowEntries, type CashFlowEntry } from '@/hooks/useCashFlow';
import { format } from 'date-fns';
import { parseCurrencyInput } from '@/lib/numeric-validation';
import { toast } from 'sonner';

const entrySchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.string().min(1, 'Valor é obrigatório'), // Mudado para string para entrada livre
  type: z.enum(['income', 'expense']),
  category_id: z.string().nullable(),
  date: z.string().min(1, 'Data é obrigatória'),
  status: z.enum(['pending', 'paid', 'received']),
  due_date: z.string().nullable(),
  is_recurring: z.boolean(),
  recurrence_type: z.enum(['weekly', 'monthly', 'yearly']).nullable(),
  recurrence_end_date: z.string().nullable(),
  notes: z.string().nullable(),
});

type EntryFormData = z.infer<typeof entrySchema>;

interface CashFlowEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: CashFlowEntry | null;
}

export default function CashFlowEntryDialog({ 
  open, 
  onOpenChange, 
  entry 
}: CashFlowEntryDialogProps) {
  const { categories } = useCashFlowCategories();
  const { createEntry, updateEntry } = useCashFlowEntries();
  const [selectedType, setSelectedType] = useState<'income' | 'expense'>('expense');

  const form = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      description: '',
      amount: '',
      type: 'expense',
      category_id: null,
      date: format(new Date(), 'yyyy-MM-dd'),
      status: 'pending',
      due_date: null,
      is_recurring: false,
      recurrence_type: null,
      recurrence_end_date: null,
      notes: null,
    },
  });

  const isRecurring = form.watch('is_recurring');
  const type = form.watch('type');

  useEffect(() => {
    if (entry) {
      form.reset({
        description: entry.description,
        amount: entry.amount.toString(), // Converte para string para edição
        type: entry.type,
        category_id: entry.category_id,
        date: entry.date,
        status: entry.status,
        due_date: entry.due_date,
        is_recurring: entry.is_recurring,
        recurrence_type: entry.recurrence_type,
        recurrence_end_date: entry.recurrence_end_date,
        notes: entry.notes,
      });
      setSelectedType(entry.type);
    } else {
      form.reset({
        description: '',
        amount: '',
        type: 'expense',
        category_id: null,
        date: format(new Date(), 'yyyy-MM-dd'),
        status: 'pending',
        due_date: null,
        is_recurring: false,
        recurrence_type: null,
        recurrence_end_date: null,
        notes: null,
      });
      setSelectedType('expense');
    }
  }, [entry, form, open]);

  useEffect(() => {
    setSelectedType(type);
  }, [type]);

  const filteredCategories = categories.filter(c => c.type === selectedType);

  const onSubmit = async (data: EntryFormData) => {
    // Valida e parseia o valor usando parseCurrencyInput
    const parseResult = parseCurrencyInput(data.amount);
    if (!parseResult.isValid) {
      toast.error(parseResult.error || 'Valor inválido');
      return;
    }
    const amount = parseResult.value; // Número válido

    const entryData = {
      description: data.description,
      amount, // Usa o valor parseado
      type: data.type,
      category_id: data.category_id,
      date: data.date,
      status: data.status,
      due_date: data.due_date,
      is_recurring: data.is_recurring,
      recurrence_type: data.recurrence_type,
      recurrence_end_date: data.recurrence_end_date,
      notes: data.notes,
      parent_entry_id: null,
    };

    if (entry) {
      await updateEntry.mutateAsync({ id: entry.id, ...entryData });
    } else {
      await createEntry.mutateAsync(entryData);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border border-blue-200 bg-white">
        <DialogHeader>
          <DialogTitle className="text-gray-900">
            {entry ? 'Editar Lançamento' : 'Novo Lançamento'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Type Selection */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-900">Tipo</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={field.value === 'income' ? 'default' : 'outline'}
                      className={field.value === 'income' ? 'bg-green-600 hover:bg-green-700' : 'border-blue-200 text-blue-700 hover:bg-blue-50'}
                      onClick={() => {
                        field.onChange('income');
                        form.setValue('category_id', null);
                      }}
                    >
                      Entrada
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === 'expense' ? 'default' : 'outline'}
                      className={field.value === 'expense' ? 'bg-red-600 hover:bg-red-700' : 'border-blue-200 text-blue-700 hover:bg-blue-50'}
                      onClick={() => {
                        field.onChange('expense');
                        form.setValue('category_id', null);
                      }}
                    >
                      Saída
                    </Button>
                  </div>
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-900">Descrição</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Pagamento fornecedor X" {...field} className="border-blue-200 focus:border-blue-500" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount and Category */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900">Valor (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        {...field}
                        className="border-blue-200 focus:border-blue-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900">Categoria</FormLabel>
                    <Select
                      value={field.value || ''}
                      onValueChange={(value) => field.onChange(value || null)}
                    >
                      <FormControl>
                        <SelectTrigger className="border-blue-200 focus:border-blue-500">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: cat.color }}
                              />
                              {cat.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date and Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900">Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="border-blue-200 focus:border-blue-500" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900">Vencimento</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        className="border-blue-200 focus:border-blue-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-900">Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="border-blue-200 focus:border-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="received">Recebido</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recurring */}
            <FormField
              control={form.control}
              name="is_recurring"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-blue-200 p-4 bg-blue-50">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base text-gray-900">Lançamento Recorrente</FormLabel>
                    <p className="text-sm text-gray-600">
                      Repetir automaticamente este lançamento
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {isRecurring && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="recurrence_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-900">Frequência</FormLabel>
                      <Select
                        value={field.value || ''}
                        onValueChange={(value) => field.onChange(value || null)}
                      >
                        <FormControl>
                          <SelectTrigger className="border-blue-200 focus:border-blue-500">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="monthly">Mensal</SelectItem>
                          <SelectItem value="yearly">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recurrence_end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-900">Até quando</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          className="border-blue-200 focus:border-blue-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-900">Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações adicionais..."
                      className="resize-none border-blue-200 focus:border-blue-500"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-blue-200 text-blue-700 hover:bg-blue-50">
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={createEntry.isPending || updateEntry.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {entry ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}