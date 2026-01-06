import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Upload as UploadIcon,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { parseTikTokCSVRow, ParsedTikTokRow, excludedStatuses } from '@/lib/tiktok-helpers';

function TikTokUploadContent() {
  const { user } = useAuth();
  const [isDragActive, setIsDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'success'>('upload');
  const [parsedData, setParsedData] = useState<ParsedTikTokRow[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [replaceExisting, setReplaceExisting] = useState(true);

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split('\n');
    if (lines.length < 2) return [];

    const headerLine = lines[0].replace(/^\uFEFF/, '');
    const headers = headerLine.split(',').map(h => h.trim());

    const rows: Record<string, string>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }

    return rows;
  };

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
      const text = await file.text();
      setProgress(30);

      const rows = parseCSV(text);
      setProgress(50);

      const parsed: ParsedTikTokRow[] = [];
      let skipped = 0;

      rows.forEach(row => {
        const parsedRow = parseTikTokCSVRow(row);
        if (parsedRow) {
          parsed.push(parsedRow);
        } else {
          skipped++;
        }
      });

      setParsedData(parsed);
      setSkippedCount(skipped);
      setProgress(100);
      setStep('preview');
      toast.success(`${parsed.length} pedidos válidos encontrados`);
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
      if (droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        processFile(droppedFile);
      } else {
        toast.error('Por favor, envie um arquivo CSV');
      }
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const selectedFile = files[0];
      if (selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        processFile(selectedFile);
      } else {
        toast.error('Por favor, envie um arquivo CSV');
      }
    }
  };

  const resetUpload = () => {
    setFile(null);
    setParsedData([]);
    setSkippedCount(0);
    setProgress(0);
    setStep('upload');
  };

  const handleImport = async () => {
    if (!user || parsedData.length === 0) return;

    setStep('importing');
    setProgress(0);

    try {
      if (replaceExisting) {
        const { error: deleteError } = await supabase
          .from('tiktok_orders')
          .delete()
          .eq('user_id', user.id);

        if (deleteError) {
          console.error('Error deleting existing orders:', deleteError);
          toast.error('Erro ao limpar pedidos anteriores');
          setStep('preview');
          return;
        }
      }

      const batchSize = 100;
      let imported = 0;
      let errors = 0;

      for (let i = 0; i < parsedData.length; i += batchSize) {
        const batch = parsedData.slice(i, i + batchSize).map(row => ({
          user_id: user.id,
          order_id: row.order_id,
          sku: row.sku,
          nome_produto: row.nome_produto,
          variacao: row.variacao,
          quantidade: row.quantidade,
          total_faturado: row.total_faturado,
          desconto_plataforma: row.desconto_plataforma,
          desconto_vendedor: row.desconto_vendedor,
          data_pedido: row.data_pedido,
          status_pedido: row.status_pedido,
          custo_unitario: 0,
        }));

        const { error } = await supabase.from('tiktok_orders').insert(batch);

        if (error) {
          console.error('Batch error:', error);
          errors += batch.length;
        } else {
          imported += batch.length;
        }

        setProgress((i + batchSize) / parsedData.length * 100);
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
      setStep('preview');
    }
  };

  const renderUploadStep = () => (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Upload de Relatório do TikTok Shop
        </CardTitle>
        <CardDescription>
          Faça upload do arquivo CSV exportado do TikTok Shop para importar seus pedidos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200
            ${isDragActive 
              ? 'border-primary bg-accent scale-[1.02]' 
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50'
            }
          `}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          <div className="space-y-4">
            <div className={`
              mx-auto h-16 w-16 rounded-full flex items-center justify-center transition-colors
              ${isDragActive ? 'bg-primary text-primary-foreground' : 'bg-muted'}
            `}>
              <UploadIcon className="h-8 w-8" />
            </div>
            
            <div>
              <p className="text-lg font-medium">
                {isDragActive ? 'Solte o arquivo aqui' : 'Arraste o arquivo ou clique para selecionar'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Apenas arquivos CSV (.csv)
              </p>
            </div>

            <Button variant="secondary" className="pointer-events-none">
              Selecionar Arquivo
            </Button>
          </div>
        </div>

        {isProcessing && (
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Processando arquivo...</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Informações importantes:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Pedidos com status <strong>"{excludedStatuses.join('", "')}"</strong> serão ignorados</li>
            <li>• Os valores em "BRL" serão convertidos automaticamente</li>
            <li>• Você poderá preencher os custos unitários depois</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );

  const renderPreviewStep = () => (
    <Card className="max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Preview da Importação
            </CardTitle>
            <CardDescription>
              Verifique se os dados estão corretos antes de importar.
              {parsedData.length} pedidos válidos | {skippedCount} ignorados
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={resetUpload}>
            <XCircle className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-3 p-4 bg-accent rounded-lg">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium">{file?.name}</p>
            <p className="text-sm text-muted-foreground">
              {parsedData.length} linhas válidas
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Switch
            id="replace"
            checked={replaceExisting}
            onCheckedChange={setReplaceExisting}
          />
          <Label htmlFor="replace">Substituir pedidos anteriores</Label>
        </div>

        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Pedido</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Variação</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Total (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsedData.slice(0, 10).map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-mono text-xs">{row.order_id.slice(0, 15)}...</TableCell>
                  <TableCell className="max-w-[200px] truncate">{row.nome_produto?.slice(0, 40)}...</TableCell>
                  <TableCell>{row.variacao?.slice(0, 20) || '-'}</TableCell>
                  <TableCell className="text-right">{row.quantidade}</TableCell>
                  <TableCell className="text-right">R$ {row.total_faturado.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {parsedData.length > 10 && (
            <div className="p-3 bg-muted text-center text-sm text-muted-foreground">
              Mostrando 10 de {parsedData.length} pedidos
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={resetUpload}>
            <XCircle className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleImport}>
            Importar {parsedData.length} Pedidos
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderImportingStep = () => (
    <Card className="max-w-md mx-auto">
      <CardContent className="py-12">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
          <h3 className="text-lg font-medium">Importando pedidos...</h3>
          <Progress value={progress} className="w-64 mx-auto" />
          <p className="text-sm text-muted-foreground">
            {Math.round(progress)}% concluído
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const renderSuccessStep = () => (
    <Card className="max-w-md mx-auto">
      <CardContent className="py-12">
        <div className="text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 mx-auto text-success" />
          <h3 className="text-xl font-medium">Importação Concluída!</h3>
          <p className="text-muted-foreground">
            {parsedData.length} pedidos foram importados com sucesso
          </p>
          <div className="flex gap-3 justify-center pt-4">
            <Button onClick={resetUpload} variant="outline">
              Importar Outro Arquivo
            </Button>
            <Button asChild>
              <a href="/tiktok/resultados">Ver Resultados</a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {step === 'upload' && renderUploadStep()}
      {step === 'preview' && renderPreviewStep()}
      {step === 'importing' && renderImportingStep()}
      {step === 'success' && renderSuccessStep()}
    </div>
  );
}

export default function TikTokUpload() {
  return (
    <ProtectedRoute>
      <AppLayout title="Upload TikTok">
        <TikTokUploadContent />
      </AppLayout>
    </ProtectedRoute>
  );
}
