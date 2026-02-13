import { useState, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
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
import { motion } from 'framer-motion';

type FileFormat = 'ofx' | 'csv' | 'xlsx' | 'pdf' | 'unknown';

interface TransactionWithSelection extends BankTransaction {
  selected: boolean;
  categoryId: string | null;
}

function FluxoCaixaImportacaoContent() {
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
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
        // Converter PDF para Base64 e enviar para Edge Function
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

      // Adicionar seleção e categoria padrão
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
  };

  const suggestCategory = (transaction: BankTransaction): string | null => {
    const desc = transaction.description.toLowerCase();
    
    // Sugerir categoria baseado em palavras-chave comuns
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

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processFile(files[0]);
    }
  }, [selectedBank]);

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

      // Limpar estado
      setTransactions([]);
      setParseResult(null);
      setFileInfo(null);
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
    <AppLayout>
      <motion.div 
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <h1 className="text-3xl font-bold text-gray-900">Importar Extrato Bancário</h1>
          <p className="text-gray-600">
            Importe transações automaticamente a partir do extrato do seu banco
          </p>
        </motion.div>

        {/* Upload Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="border border-blue-200 shadow-lg bg-white">
            <CardHeader className="bg-blue-50 border-b border-blue-200">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Upload className="h-5 w-5 text-blue-600" />
                Upload de Extrato
              </CardTitle>
              <CardDescription className="text-gray-600">
                Arraste um arquivo PDF, OFX, CSV ou XLSX do seu banco
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Bank Selection */}
              <motion.div 
                className="flex items-center gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900">Banco:</span>
                </div>
                <Select value={selectedBank} onValueChange={setSelectedBank}>
                  <SelectTrigger className="w-[250px] border-blue-200 focus:border-blue-500">
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
                <span className="text-xs text-gray-500">
                  (Ajuda a identificar as colunas corretamente)
                </span>
              </motion.div>

              {/* Drop Zone */}
              <motion.div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
                  ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-blue-300'}
                  ${isProcessing ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:border-blue-400'}
                `}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.4 }}
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
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                    <p className="text-lg font-medium text-gray-900">Processando arquivo...</p>
                    <p className="text-sm text-gray-600">
                      {fileInfo?.format === 'pdf' ? 'Analisando PDF com IA...' : 'Extraindo transações...'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 rounded-full bg-blue-100">
                      <FileSpreadsheet className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        Arraste seu extrato aqui ou clique para selecionar
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Formatos suportados: PDF, OFX, CSV, XLSX
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* File Info */}
              {fileInfo && !isProcessing && (
                <motion.div 
                  className="flex items-center gap-2 text-sm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-gray-900">{fileInfo.name}</span>
                  <Badge variant="outline" className="border-blue-200 text-blue-700">{fileInfo.format.toUpperCase()}</Badge>
                </motion.div>
              )}

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Alert variant="destructive" className="border-red-500 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="text-red-800">Erro no processamento</AlertTitle>
                    <AlertDescription className="text-red-700">{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Transactions Preview */}
        {transactions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="border border-blue-200 shadow-lg bg-white">
              <CardHeader className="bg-blue-50 border-b border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      Transações Detectadas
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Revise e selecione as transações que deseja importar
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {selectedCount} de {transactions.length} selecionadas
                      </p>
                      <p className={`text-lg font-bold ${totalSelected >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(totalSelected)}
                      </p>
                    </div>
                    <Button onClick={handleImport} disabled={isImporting || selectedCount === 0} className="bg-blue-600 hover:bg-blue-700">
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
              </CardHeader>
              <CardContent className="p-0">
                <Table className="border border-blue-200 rounded-lg overflow-hidden">
                  <TableHeader className="bg-blue-50">
                    <TableRow>
                      <TableHead className="w-12 text-gray-900">
                        <Checkbox
                          checked={transactions.every(t => t.selected)}
                          onCheckedChange={(checked) => toggleSelectAll(checked as boolean)}
                        />
                      </TableHead>
                      <TableHead className="text-gray-900">Data</TableHead>
                      <TableHead className="text-gray-900">Descrição</TableHead>
                      <TableHead className="text-gray-900">Contraparte</TableHead>
                      <TableHead className="text-gray-900">Tipo</TableHead>
                      <TableHead className="text-right text-gray-900">Valor</TableHead>
                      <TableHead className="text-gray-900">Categoria</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t, index) => (
                      <motion.tr 
                        key={t.id} 
                        className={`border-b border-blue-200 hover:bg-blue-25 ${!t.selected ? 'opacity-50' : ''}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: index * 0.05 }}
                      >
                        <TableCell>
                          <Checkbox
                            checked={t.selected}
                            onCheckedChange={() => toggleTransaction(t.id)}
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-gray-900">
                          {format(parseISO(t.date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate text-gray-900" title={t.description}>
                          {t.description}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {t.counterpart || '-'}
                        </TableCell>
                        <TableCell>
                          {t.type === 'income' ? (
                            <Badge variant="default" className="bg-green-600 text-white">
                              <ArrowUpCircle className="h-3 w-3 mr-1" />
                              Entrada
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-red-500 text-white">
                              <ArrowDownCircle className="h-3 w-3 mr-1" />
                              Saída
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${
                          t.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {t.type === 'expense' ? '-' : '+'}{formatCurrency(t.amount)}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={t.categoryId || 'none'}
                            onValueChange={(value) => updateTransactionCategory(t.id, value === 'none' ? null as string | null : value)}
                          >
                            <SelectTrigger className="w-[160px] h-8 text-xs border-blue-200 focus:border-blue-500">
                              <SelectValue placeholder="Selecionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem categoria</SelectItem>
                              {categories
                                .filter(c => c.type === t.type)
                                .map(c => (
                                  <SelectItem key={c.id} value={c.id}>
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-2 h-2 rounded-full" 
                                        style={{ backgroundColor: c.color }}
                                      />
                                      {c.name}
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTransaction(t.id)}
                            className="h-8 w-8 hover:bg-red-50 text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Info Card */}
        {transactions.length === 0 && !isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="border border-blue-200 shadow-lg bg-white">
              <CardHeader className="bg-blue-50 border-b border-blue-200">
                <CardTitle className="text-gray-900">Formatos Suportados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <motion.div 
                    className="p-4 rounded-lg border border-blue-200 bg-white shadow-sm"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-5 w-5 text-red-500" />
                      <span className="font-medium text-gray-900">PDF</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Extratos em PDF são analisados por IA para detectar transações automaticamente.
                    </p>
                  </motion.div>
                  <motion.div 
                    className="p-4 rounded-lg border border-blue-200 bg-white shadow-sm"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <span className="font-medium text-gray-900">OFX</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Formato bancário padrão. Disponível na maioria dos bancos tradicionais.
                    </p>
                  </motion.div>
                  <motion.div 
                    className="p-4 rounded-lg border border-blue-200 bg-white shadow-sm"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FileSpreadsheet className="h-5 w-5 text-green-500" />
                      <span className="font-medium text-gray-900">CSV</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Exportação comum em bancos digitais como Nubank e Inter.
                    </p>
                  </motion.div>
                  <motion.div 
                    className="p-4 rounded-lg border border-blue-200 bg-white shadow-sm"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.4 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                      <span className="font-medium text-gray-900">XLSX</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Planilhas Excel exportadas de sistemas bancários.
                    </p>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </AppLayout>
  );
}

export default function FluxoCaixaImportacao() {
  return (
    <ProtectedRoute>
      <FluxoCaixaImportacaoContent />
    </ProtectedRoute>
  );
}