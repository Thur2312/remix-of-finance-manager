import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCashFlowCategories, useCashFlowEntries } from '@/hooks/useCashFlow';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Trash2,
  FileSpreadsheet,
  Building2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { 
  BankTransaction, 
  ParseResult, 
  parseOFXFile, 
  parseCSVFile, 
  parseXLSXFile,
  detectFileFormat,
  SUPPORTED_BANKS,
} from '@/lib/bank-statement-helpers';

type FileFormat = 'ofx' | 'csv' | 'xlsx' | 'pdf' | 'unknown';

interface TransactionWithSelection extends BankTransaction {
  selected: boolean;
  categoryId: string | null;
}

interface ImportBankStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ImportBankStatementDialog({ open, onOpenChange }: ImportBankStatementDialogProps) {
  const { toast } = useToast();
  const { categories } = useCashFlowCategories();
  const { createEntry } = useCashFlowEntries();

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedBank, setSelectedBank] = useState('generic');
  const [fileInfo, setFileInfo] = useState<{ name: string; format: FileFormat } | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [transactions, setTransactions] = useState<TransactionWithSelection[]>([]);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const resetState = () => {
    setIsDragging(false);
    setIsProcessing(false);
    setIsImporting(false);
    setFileInfo(null);
    setParseResult(null);
    setTransactions([]);
    setError(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const suggestCategory = (transaction: BankTransaction): string | null => {
    const desc = transaction.description.toLowerCase();
    
    const incomeCategories = categories.filter(c => c.type === 'income');
    const expenseCategories = categories.filter(c => c.type === 'expense');

    if (transaction.type === 'income') {
      if (desc.includes('venda') || desc.includes('mercado livre') || desc.includes('shopee') || desc.includes('tiktok')) {
        return incomeCategories.find(c => c.name.toLowerCase().includes('venda'))?.id || null;
      }
      if (desc.includes('pix') || desc.includes('ted') || desc.includes('transf')) {
        return incomeCategories.find(c => c.name.toLowerCase().includes('outro'))?.id || null;
      }
    } else {
      if (desc.includes('fornecedor') || desc.includes('compra') || desc.includes('mercadoria')) {
        return expenseCategories.find(c => c.name.toLowerCase().includes('fornecedor'))?.id || null;
      }
      if (desc.includes('imposto') || desc.includes('darf') || desc.includes('tributo')) {
        return expenseCategories.find(c => c.name.toLowerCase().includes('imposto'))?.id || null;
      }
      if (desc.includes('frete') || desc.includes('correios') || desc.includes('logística')) {
        return expenseCategories.find(c => c.name.toLowerCase().includes('logística'))?.id || null;
      }
      if (desc.includes('salário') || desc.includes('folha') || desc.includes('funcionário')) {
        return expenseCategories.find(c => c.name.toLowerCase().includes('salário'))?.id || null;
      }
      if (desc.includes('aluguel') || desc.includes('locação')) {
        return expenseCategories.find(c => c.name.toLowerCase().includes('aluguel'))?.id || null;
      }
      if (desc.includes('marketing') || desc.includes('ads') || desc.includes('anúncio') || desc.includes('facebook') || desc.includes('google')) {
        return expenseCategories.find(c => c.name.toLowerCase().includes('marketing'))?.id || null;
      }
    }

    return null;
  };

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setTransactions([]);
    setParseResult(null);

    const format = detectFileFormat(file);
    setFileInfo({ name: file.name, format });

    if (format === 'unknown') {
      setError('Formato de arquivo não suportado. Use PDF, OFX, CSV ou XLSX.');
      setIsProcessing(false);
      return;
    }

    try {
      let result: ParseResult;

      if (format === 'pdf') {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const { data, error: fnError } = await supabase.functions.invoke('parse-bank-statement', {
          body: { pdfBase64: base64, fileName: file.name },
        });

        if (fnError) {
          throw new Error(fnError.message || 'Erro ao processar PDF');
        }

        if (data.error) {
          throw new Error(data.error);
        }

        result = data as ParseResult;
      } else if (format === 'ofx') {
        result = await parseOFXFile(file);
      } else if (format === 'csv') {
        result = await parseCSVFile(file, selectedBank);
      } else {
        result = await parseXLSXFile(file, selectedBank);
      }

      setParseResult(result);

      const transactionsWithSelection: TransactionWithSelection[] = result.transactions.map(t => ({
        ...t,
        selected: true,
        categoryId: suggestCategory(t),
      }));

      setTransactions(transactionsWithSelection);

      if (result.transactions.length === 0) {
        setError('Nenhuma transação encontrada no arquivo. Verifique se o formato está correto.');
      } else {
        toast({
          title: 'Arquivo processado!',
          description: `${result.transactions.length} transações encontradas.`,
        });
      }
    } catch (err) {
      console.error('Error processing file:', err);
      setError(err instanceof Error ? err.message : 'Erro ao processar arquivo');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedBank, categories ]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processFile(files[0]);
    }
  }, [selectedBank, categories]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    setTransactions(prev => prev.map(t => ({ ...t, selected: checked })));
  };

  const toggleTransaction = (id: string) => {
    setTransactions(prev => 
      prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t)
    );
  };

  const updateTransactionCategory = (id: string, categoryId: string) => {
    setTransactions(prev =>
      prev.map(t => t.id === id ? { ...t, categoryId } : t)
    );
  };

  const removeTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleImport = async () => {
    const selectedTransactions = transactions.filter(t => t.selected);
    
    if (selectedTransactions.length === 0) {
      toast({
        title: 'Nenhuma transação selecionada',
        description: 'Selecione ao menos uma transação para importar.',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);

    try {
      for (const t of selectedTransactions) {
        await createEntry.mutateAsync({
          description: t.description + (t.counterpart ? ` (${t.counterpart})` : ''),
          amount: t.amount,
          type: t.type,
          date: t.date,
          category_id: t.categoryId,
          status: t.type === 'income' ? 'received' : 'paid',
          due_date: null,
          is_recurring: false,
          recurrence_type: null,
          recurrence_end_date: null,
          parent_entry_id: null,
          notes: `Importado de extrato bancário${parseResult?.bankName ? ` - ${parseResult.bankName}` : ''}`,
        });
      }

      toast({
        title: 'Importação concluída!',
        description: `${selectedTransactions.length} lançamentos criados com sucesso.`,
      });

      handleOpenChange(false);
    } catch (err) {
      console.error('Error importing transactions:', err);
      toast({
        title: 'Erro na importação',
        description: 'Alguns lançamentos podem não ter sido criados. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const selectedCount = transactions.filter(t => t.selected).length;
  const totalSelected = transactions
    .filter(t => t.selected)
    .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Importar Extrato Bancário
          </DialogTitle>
          <DialogDescription>
            Importe transações automaticamente a partir do extrato do seu banco
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Bank Selection */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Banco:</span>
            </div>
            <Select value={selectedBank} onValueChange={setSelectedBank}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selecione o banco" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_BANKS.map(bank => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              (Ajuda a identificar as colunas corretamente)
            </span>
          </div>

          {/* Drop Zone - Only show if no transactions */}
          {transactions.length === 0 && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
                ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                ${isProcessing ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:border-primary/50'}
              `}
            >
              <input
                type="file"
                accept=".pdf,.ofx,.ofc,.csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isProcessing}
              />
              
              {isProcessing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-lg font-medium">Processando arquivo...</p>
                  <p className="text-sm text-muted-foreground">
                    {fileInfo?.format === 'pdf' ? 'Analisando PDF com IA...' : 'Extraindo transações...'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 rounded-full bg-primary/10">
                    <FileSpreadsheet className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-medium">
                      Arraste seu extrato aqui ou clique para selecionar
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Formatos suportados: PDF, OFX, CSV, XLSX
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* File Info */}
          {fileInfo && !isProcessing && transactions.length === 0 && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{fileInfo.name}</span>
              <Badge variant="outline">{fileInfo.format.toUpperCase()}</Badge>
            </div>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro no processamento</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Transactions Preview */}
          {transactions.length > 0 && (
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-semibold">Transações Detectadas</span>
                  <span className="text-sm text-muted-foreground">
                    ({selectedCount} de {transactions.length} selecionadas)
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <p className={`text-lg font-bold ${totalSelected >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(totalSelected)}
                  </p>
                  <Button onClick={handleImport} disabled={isImporting || selectedCount === 0}>
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Importar Selecionados
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={transactions.every(t => t.selected)}
                          onCheckedChange={(checked) => toggleSelectAll(checked as boolean)}
                        />
                      </TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t) => (
                      <TableRow key={t.id} className={!t.selected ? 'opacity-50' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={t.selected}
                            onCheckedChange={() => toggleTransaction(t.id)}
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {format(parseISO(t.date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={t.description}>
                          {t.description}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {t.type === 'income' ? (
                              <ArrowUpCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <ArrowDownCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="text-xs">
                              {t.type === 'income' ? 'Entrada' : 'Saída'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className={`text-right font-medium whitespace-nowrap ${
                          t.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {t.type === 'expense' ? '-' : '+'}{formatCurrency(t.amount)}
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={t.categoryId || ''} 
                            onValueChange={(v) => updateTransactionCategory(t.id, v)}
                          >
                            <SelectTrigger className="w-[150px] h-8 text-xs">
                              <SelectValue placeholder="Selecionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              {categories
                                .filter(c => c.type === t.type)
                                .map(cat => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-2 h-2 rounded-full" 
                                        style={{ backgroundColor: cat.color }}
                                      />
                                      {cat.name}
                                    </div>
                                  </SelectItem>
                                ))
                              }
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeTransaction(t.id)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
