import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Upload as UploadIcon,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MissingCostsModal, MissingSku } from '@/components/upload/MissingCostsModal';

interface ParsedRow {
  order_id: string;
  sku: string;
  nome_produto: string;
  variacao: string;
  quantidade: number;
  total_faturado: number;
  rebate_shopee: number;
  custo_unitario: number;
  data_pedido: string | null;
}

interface ColumnMapping {
  order_id: string;
  sku: string;
  nome_produto: string;
  variacao: string;
  quantidade: string;
  total_faturado: string;
  rebate_shopee: string;
  data_pedido: string ;
}

interface RawRowData {
  [key: string]: string | number  | undefined;
}

const defaultMapping: ColumnMapping = {
  order_id: 'ID do pedido',
  sku: 'SKU do produto',
  nome_produto: 'Nome do produto',
  variacao: 'Nome da variação',
  quantidade: 'Quantidade',
  total_faturado: 'Preço acordado',
  rebate_shopee: 'Rebate da Shopee',
  data_pedido: 'Data de criação do pedido',
};

const requiredFields: (keyof ColumnMapping)[] = ['order_id', 'nome_produto', 'quantidade', 'total_faturado'];

function UploadContent() {
  const { user } = useAuth();
  const [isDragActive, setIsDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<RawRowData []>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(defaultMapping);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'success'>('upload');
  const [parsedRows, setParsedRows] = useState<RawRowData[]>([]);
  const [importStats, setImportStats] = useState({ total: 0, imported: 0, errors: 0 });
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [missingCostsModalOpen, setMissingCostsModalOpen] = useState(false);
  const [missingSkus, setMissingSkus] = useState<MissingSku[]>([]);
  const [pendingCosts, setPendingCosts] = useState<Record<string, number>>({});
  const [isSavingCosts, setIsSavingCosts] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setProgress(10);

    try {
      const data = await file.arrayBuffer();
      setProgress(30);

      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

      setProgress(50);

      if (jsonData.length < 2) {
        toast.error('O arquivo não contém dados suficientes');
        resetUpload();
        return;
      }

      const fileHeaders = jsonData[0].map((h: unknown) => String(h || '').trim());
      setHeaders(fileHeaders);
      
      // Auto-map columns based on common names
      const autoMapping = { ...defaultMapping };
      Object.keys(defaultMapping).forEach((key) => {
        const mappingKey = key as keyof ColumnMapping;
        const defaultValue = defaultMapping[mappingKey];
        const found = fileHeaders.find(h => 
          h.toLowerCase().includes(defaultValue.toLowerCase()) ||
          defaultValue.toLowerCase().includes(h.toLowerCase())
        );
        if (found) {
          autoMapping[mappingKey] = found;
        }
      });
      setMapping(autoMapping);

      // Preview first 5 rows and parse all rows
      const allRows: Record<string, unknown>[] = jsonData.slice(1).map(row => {
        const obj: Record<string, unknown> = {};
        fileHeaders.forEach((header, index) => {
          obj[header] = row[index];
        });
        return obj;
      });
      
      setPreviewData(allRows.slice(0, 5) as RawRowData[]);
      setParsedRows(allRows as RawRowData[]);

      setProgress(100);
      setStep('mapping');
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Erro ao processar o arquivo');
      resetUpload();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const droppedFile = files[0];
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls') || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        processFile(droppedFile);
      } else {
        toast.error('Por favor, envie um arquivo Excel (.xlsx, .xls) ou CSV (.csv)');
      }
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        processFile(selectedFile);
      } else {
        toast.error('Por favor, envie um arquivo Excel (.xlsx, .xls) ou CSV (.csv)');
      }
    }
  };

  const resetUpload = () => {
    setFile(null);
    setHeaders([]);
    setPreviewData([]);
    setParsedRows([]);
    setProgress(0);
    setStep('upload');
    setImportStats({ total: 0, imported: 0, errors: 0 });
  };

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    setMapping(prev => ({ ...prev, [field]: value }));
  };

  const validateMapping = (): boolean => {
    for (const field of requiredFields) {
      if (!mapping[field] || !headers.includes(mapping[field])) {
        toast.error(`O campo "${getFieldLabel(field)}" é obrigatório e precisa ser mapeado`);
        return false;
      }
    }
    return true;
  };

  const getFieldLabel = (field: keyof ColumnMapping): string => {
    const labels: Record<keyof ColumnMapping, string> = {
      order_id: 'ID do Pedido',
      sku: 'SKU',
      nome_produto: 'Nome do Produto',
      variacao: 'Variação',
      quantidade: 'Quantidade',
      total_faturado: 'Total Faturado',
      rebate_shopee: 'Rebate Shopee',
      data_pedido: 'Data do Pedido',
    };
    return labels[field];
  };

  const processDataForImport = (): ParsedRow[] => {
    return parsedRows.map(row => {
      const getValue = (field: keyof ColumnMapping) => {
        const header = mapping[field];
        return header ? row[header] : null;
      };

      const parseNumber = (value: string | number | null | undefined | ''): number => {
        if (value === null || value === undefined || value === '') return 0;
        if (typeof value === 'number') return value;
        const parsed = parseFloat(String(value).replace(/[^\d.,-]/g, '').replace(',', '.'));
        return isNaN(parsed) ? 0 : parsed;
      };

      const parseDate = (value: string | number | Date | null | undefined): string | null => {
        if (!value) return null;
        if (value instanceof Date) return value.toISOString();
        try {
          const date = new Date(value);
          if (!isNaN(date.getTime())) return date.toISOString();
        } catch {
          return null;
        }
        return null;
      };

      const rawQuantidade = getValue('quantidade');
      const rawTotal = getValue('total_faturado');
      const rawRebate = getValue('rebate_shopee');
      const rawDataPedido = getValue('data_pedido');

      // Parse data_pedido with proper type handling
      let parsedDataPedido: string | null = null;
      if (typeof rawDataPedido === 'string') {
        parsedDataPedido = parseDate(rawDataPedido);
      } else if (rawDataPedido && typeof rawDataPedido === 'object' && 'getTime' in (rawDataPedido as object)) {
        parsedDataPedido = parseDate(rawDataPedido as Date);
      }

      return {
        order_id: String(getValue('order_id') || ''),
        sku: String(getValue('sku') || ''),
        nome_produto: String(getValue('nome_produto') || ''),
        variacao: String(getValue('variacao') || ''),
        quantidade: Math.max(1, Math.round(parseNumber(typeof rawQuantidade === 'number' ? rawQuantidade : (rawQuantidade === '' ? '' : 0)))),
        total_faturado: parseNumber(typeof rawTotal === 'number' ? rawTotal : (rawTotal === '' ? '' : 0)),
        rebate_shopee: parseNumber(typeof rawRebate === 'number' ? rawRebate : (rawRebate === '' ? '' : 0)),
        custo_unitario: 0,
        data_pedido: parsedDataPedido,
      };
    }).filter(row => row.order_id && row.nome_produto);
  };

  const handlePreview = async () => {
    if (!validateMapping()) return;
    if (!user) return;

    // Check for missing costs
    const dataToImport = processDataForImport();
    const uniqueSkus = [...new Set(dataToImport.filter(r => r.sku).map(r => r.sku))];

    if (uniqueSkus.length > 0) {
      // Fetch existing costs
      const { data: existingCosts } = await supabase
        .from('product_costs')
        .select('sku')
        .eq('user_id', user.id)
        .in('sku', uniqueSkus);

      const existingSkuSet = new Set(existingCosts?.map(c => c.sku) || []);
      
      // Find SKUs without costs
      const missing: MissingSku[] = [];
      const skuQuantities: Record<string, { nome_produto: string; quantidade: number }> = {};

      for (const row of dataToImport) {
        if (row.sku && !existingSkuSet.has(row.sku) && !pendingCosts[row.sku]) {
          if (!skuQuantities[row.sku]) {
            skuQuantities[row.sku] = { nome_produto: row.nome_produto, quantidade: 0 };
          }
          skuQuantities[row.sku].quantidade += row.quantidade;
        }
      }

      for (const [sku, data] of Object.entries(skuQuantities)) {
        missing.push({ sku, ...data });
      }

      if (missing.length > 0) {
        setMissingSkus(missing);
        setMissingCostsModalOpen(true);
        return;
      }
    }

    setStep('preview');
  };

  const handleSaveCosts = async (costs: Record<string, number>) => {
    if (!user) return;
    setIsSavingCosts(true);

    try {
      const costsToInsert = Object.entries(costs).map(([sku, cost]) => ({
        user_id: user.id,
        sku,
        cost,
        effective_from: new Date().toISOString().split('T')[0],
      }));

      const { error } = await supabase.from('product_costs').insert(costsToInsert);

      if (error) throw error;

      setPendingCosts(prev => ({ ...prev, ...costs }));
      setMissingCostsModalOpen(false);
      toast.success('Custos salvos com sucesso!');
      setStep('preview');
    } catch (error) {
      console.error('Error saving costs:', error);
      toast.error('Erro ao salvar custos');
    } finally {
      setIsSavingCosts(false);
    }
  };

  const handleImport = async () => {
    if (!user) return;

    setIsProcessing(true);
    const dataToImport = processDataForImport();
    setImportStats({ total: dataToImport.length, imported: 0, errors: 0 });

    try {
      // If replacing existing, delete all previous orders first
      if (replaceExisting) {
        const { error: deleteError } = await supabase
          .from('raw_orders')
          .delete()
          .eq('user_id', user.id);

        if (deleteError) {
          console.error('Error deleting existing orders:', deleteError);
          toast.error('Erro ao limpar pedidos anteriores');
          setIsProcessing(false);
          return;
        }
      }

      // Import in batches of 100
      const batchSize = 100;
      let imported = 0;
      let errors = 0;

      for (let i = 0; i < dataToImport.length; i += batchSize) {
        const batch = dataToImport.slice(i, i + batchSize).map(row => ({
          ...row,
          user_id: user.id,
        }));

        const { error } = await supabase.from('raw_orders').insert(batch);

        if (error) {
          console.error('Batch error:', error);
          errors += batch.length;
        } else {
          imported += batch.length;
        }

        setImportStats({ total: dataToImport.length, imported, errors });
        setProgress((i + batchSize) / dataToImport.length * 100);
      }

      if (errors > 0) {
        toast.warning(`Importação concluída com ${errors} erros`);
      } else {
        toast.success(`${imported} pedidos importados com sucesso!`);
      }

      setStep('success');
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erro ao importar dados');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderUploadStep = () => (
    <Card className="max-w-2xl mx-auto border-0 shadow-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
            <FileSpreadsheet className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-xl">Upload de Relatório da Shopee</CardTitle>
            <CardDescription>
              Faça upload do arquivo XLSX exportado da Shopee para importar seus pedidos
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300
            ${isDragActive 
              ? 'border-primary bg-primary/5 scale-[1.02] shadow-lg' 
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
            }
          `}
        >
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          <div className="space-y-4">
            <div className={`
              mx-auto h-20 w-20 rounded-full flex items-center justify-center transition-all duration-300
              ${isDragActive ? 'bg-primary text-primary-foreground scale-110' : 'bg-muted'}
            `}>
              <UploadIcon className="h-10 w-10" />
            </div>
            
            <div>
              <p className="text-lg font-semibold">
                {isDragActive ? 'Solte o arquivo aqui' : 'Arraste o arquivo ou clique para selecionar'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Apenas arquivos Excel (.xlsx, .xls)
              </p>
            </div>

            <Button variant="secondary" className="pointer-events-none shadow-sm">
              Selecionar Arquivo
            </Button>
          </div>
        </div>

        {isProcessing && (
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Processando arquivo...</span>
              <span className="text-primary font-semibold">{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderMappingStep = () => (
    <Card className="max-w-4xl mx-auto border-0 shadow-lg">
      <CardHeader className="border-b bg-muted/20">
        <CardTitle className="text-xl">Mapeamento de Colunas</CardTitle>
        <CardDescription>
          Selecione qual coluna do arquivo corresponde a cada campo do sistema.
          Campos com * são obrigatórios.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20">
          <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold">{file?.name}</p>
            <p className="text-sm text-muted-foreground">
              {parsedRows.length} linhas encontradas • {headers.length} colunas
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {(Object.keys(mapping) as (keyof ColumnMapping)[]).map((field) => (
            <div key={field} className="space-y-2">
              <Label className="font-medium">
                {getFieldLabel(field)}
                {requiredFields.includes(field) && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Select
                value={mapping[field]}
                onValueChange={(value) => handleMappingChange(field, value)}
              >
                <SelectTrigger className="shadow-sm">
                  <SelectValue placeholder="Selecione uma coluna" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Não mapear</SelectItem>
                  {headers.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={resetUpload}>
            <XCircle className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handlePreview} className="shadow-md">
            Continuar para Preview
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderPreviewStep = () => {
    const previewRows = processDataForImport().slice(0, 5);

    return (
      <Card className="max-w-6xl mx-auto">
        <CardHeader>
          <CardTitle>Preview da Importação</CardTitle>
          <CardDescription>
            Verifique se os dados estão corretos antes de importar.
            Mostrando as primeiras 5 linhas de {processDataForImport().length} total.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Pedido</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Variação</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Total (R$)</TableHead>
                  <TableHead className="text-right">Rebate (R$)</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-xs">{row.order_id}</TableCell>
                    <TableCell>{row.sku || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{row.nome_produto}</TableCell>
                    <TableCell>{row.variacao || '-'}</TableCell>
                    <TableCell className="text-right">{row.quantidade}</TableCell>
                    <TableCell className="text-right">{row.total_faturado.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{row.rebate_shopee.toFixed(2)}</TableCell>
                    <TableCell className="text-xs">
                      {row.data_pedido ? new Date(row.data_pedido).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 p-4 bg-accent rounded-lg">
              <AlertCircle className="h-5 w-5 text-primary" />
              <p className="text-sm">
                <strong>{processDataForImport().length}</strong> pedidos serão importados para o sistema.
              </p>
            </div>

            <div className="flex items-center space-x-3 p-4 border rounded-lg">
              <Switch
                id="replace_existing"
                checked={replaceExisting}
                onCheckedChange={setReplaceExisting}
              />
              <div>
                <Label htmlFor="replace_existing" className="font-medium cursor-pointer">
                  Substituir pedidos anteriores
                </Label>
                <p className="text-xs text-muted-foreground">
                  {replaceExisting 
                    ? 'Todos os pedidos anteriores serão excluídos antes da importação (recomendado para nova análise)'
                    : 'Os novos pedidos serão adicionados aos já existentes'}
                </p>
              </div>
            </div>
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importando...</span>
                <span>{importStats.imported} de {importStats.total}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep('mapping')}>
              Voltar
            </Button>
            <Button onClick={handleImport} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <UploadIcon className="h-4 w-4 mr-2" />
                  Importar {processDataForImport().length} Pedidos
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSuccessStep = () => (
    <Card className="max-w-md mx-auto text-center border-0 shadow-xl overflow-hidden">
      <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-8">
        <div className="mx-auto h-20 w-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-white" />
        </div>
      </div>
      <CardContent className="pt-6 pb-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Importação Concluída!</h2>
          <p className="text-muted-foreground mt-2">
            Seus dados foram importados com sucesso.
          </p>
        </div>

        <div className="bg-muted/50 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Total de registros:</span>
            <span className="font-bold text-lg">{importStats.total}</span>
          </div>
          <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
            <span>Importados com sucesso:</span>
            <span className="font-bold text-lg">{importStats.imported}</span>
          </div>
          {importStats.errors > 0 && (
            <div className="flex justify-between items-center text-red-600 dark:text-red-400">
              <span>Erros:</span>
              <span className="font-bold text-lg">{importStats.errors}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={resetUpload} className="shadow-md">
            <UploadIcon className="h-4 w-4 mr-2" />
            Fazer Novo Upload
          </Button>
          <Button variant="outline" asChild>
            <a href="/resultados">Ver Resultados</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {step === 'upload' && renderUploadStep()}
      {step === 'mapping' && renderMappingStep()}
      {step === 'preview' && renderPreviewStep()}
      {step === 'success' && renderSuccessStep()}

      <MissingCostsModal
        open={missingCostsModalOpen}
        onOpenChange={setMissingCostsModalOpen}
        missingSkus={missingSkus}
        onSubmit={handleSaveCosts}
        isLoading={isSavingCosts}
      />
    </div>
  );
}

export default function Upload() {
  return (
    <ProtectedRoute>
      <AppLayout title="Upload de Relatório">
        <UploadContent />
      </AppLayout>
    </ProtectedRoute>
  );
}
