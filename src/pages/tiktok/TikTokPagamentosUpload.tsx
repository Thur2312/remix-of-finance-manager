import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, FileWarning, Info, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { parseAllSettlements, parseStatementsSheet, ImportSummary, StatementsImportSummary } from '@/lib/tiktok-settlement-helpers';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

interface ExtendedImportSummary extends ImportSummary {
  dataSource: 'detalhes_pedido' | 'statements';
  hasLimitedData: boolean;
  statementsInfo?: StatementsImportSummary;
}

function TikTokPagamentosUploadContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [importSummary, setImportSummary] = useState<ExtendedImportSummary | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const processFile = useCallback(async (file: File) => {
    if (!user?.id) {
      toast.error('Você precisa estar logado para fazer upload');
      return;
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Apenas arquivos XLSX são aceitos para pagamentos');
      return;
    }

    setIsProcessing(true);
    setProcessedCount(0);
    setImportSummary(null);
    setShowSummary(false);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      console.log('📁 Arquivo carregado:', file.name);
      console.log('📑 Abas encontradas:', workbook.SheetNames);
      
      // === SELEÇÃO EXATA DE ABAS (conforme especificação) ===
      // Usar nomes EXATOS: "Order details" e "Statements"
      const orderDetailsSheetName = workbook.SheetNames.find(
        name => name.toLowerCase() === 'detalhes_pedido' || name.toLowerCase() === 'order details'
      );
      const statementsSheetName = workbook.SheetNames.find(
        name => name.toLowerCase() === 'statements'
      );
      
      console.log('📋 Abas encontradas:');
      console.log('  - Order details:', orderDetailsSheetName || 'NÃO ENCONTRADA');
      console.log('  - Statements:', statementsSheetName || 'NÃO ENCONTRADA');
      
      // Parse Statements sheet to get total reference
      let statementsInfo: StatementsImportSummary | undefined;
      if (statementsSheetName) {
        const statementsWs = workbook.Sheets[statementsSheetName];
        const statementsData = XLSX.utils.sheet_to_json(statementsWs, {
          defval: '',
          raw: false
        }) as Record<string, string>[];
        const parsed = parseStatementsSheet(statementsData);
        statementsInfo = parsed.summary;
        console.log('📋 Dados de Statements:', statementsInfo);
      }
      
      // === FUNÇÃO PARA TORNAR HEADERS ÚNICOS (colunas duplicadas) ===
      const makeHeadersUnique = (headers: string[]): string[] => {
        const seen = new Map<string, number>();
        return headers.map((hRaw) => {
          const h = (hRaw ?? "").toString().trim();
          const key = h.length ? h : "Unnamed";
          const count = (seen.get(key) ?? 0) + 1;
          seen.set(key, count);
          return count === 1 ? key : `${key}__${count}`; // ex: Affiliate commission refund__2
        });
      };

      // === LEITURA ROBUSTA DA ABA ORDER DETAILS (USANDO MATRIZ) ===
      const orderDetailsData: Record<string, string>[] = [];
      
      if (orderDetailsSheetName) {
        const orderDetailsWs = workbook.Sheets[orderDetailsSheetName];
        
        // 1) Ler como MATRIZ (preserva todas as linhas, mesmo com headers duplicados)
        const matrix: number[][] = XLSX.utils.sheet_to_json(orderDetailsWs, {
          header: 1,       // LER COMO MATRIZ, não objetos!
          raw: true,
          defval: "",
          blankrows: false,
        });
        
        console.log('📋 Matriz bruta lida:', matrix.length, 'linhas (incluindo header)');
        
        if (matrix.length >= 2) {
          // 2) Processar headers únicos
          const rawHeaders = matrix[0].map((h) => (h ?? "").toString().trim());
          const headers = makeHeadersUnique(rawHeaders);
          const duplicateCount = rawHeaders.length - new Set(rawHeaders.filter((h: string) => h)).size;
          
          console.log('📋 Headers encontrados:', headers.length);
          console.log('📋 Headers duplicados:', rawHeaders.filter((h, i, arr) => arr.indexOf(h) !== i));
          
          // 3) Converter linhas em objetos
          for (let i = 1; i < matrix.length; i++) {
            const row = matrix[i];
            // pula linhas completamente vazias
            if (!row || row.every((c) => (c ?? "").toString().trim() === "")) continue;
            
            const obj: Record<string, string> = {};
            for (let j = 0; j < headers.length; j++) {
              obj[headers[j]] = (row[j] ?? "").toString();
            }
            obj.__row_index = (i + 1).toString(); // linha 1-based para auditoria
            orderDetailsData.push(obj);
          }
        }
        
        // === LOGS DE VALIDAÇÃO GENÉRICA ===
        const linhasOrderDetailsBrutas = matrix.length - 1; // menos o header
        const linhasOrdersValidas = orderDetailsData.filter(row => {
          const type = row['Type'] || row['Tipo'] || '';
          const orderId = row['Order/adjustment ID'] || row['Order ID'] || row['ID do pedido'] || '';
          return type.toString().trim().toLowerCase() === 'order' && orderId.toString().trim() !== '';
        }).length;
        
        console.log('📋 Validação genérica:', {
          linhas_order_details_brutas: linhasOrderDetailsBrutas,
          linhas_convertidas_para_objetos: orderDetailsData.length,
          linhas_orders_validas: linhasOrdersValidas,
        });
      } else {
        toast.error('Aba "Detalhes do pedido" não encontrada no arquivo');
        setIsProcessing(false);
        return;
      }
      
      // If Order details has very few records compared to Statements, warn user
      const hasLimitedData = statementsInfo && 
        orderDetailsData.length < (statementsInfo.validRecords * 3);
      
      // Use Order details data for granular import
      const jsonData = orderDetailsData;
      
      if (jsonData.length === 0) {
        toast.error('Nenhum dado encontrado na aba "Detalhes do pedido"');
        setIsProcessing(false);
        return;
      }

      console.log('🔍 Colunas encontradas:', Object.keys(jsonData[0] || {}));

      // Parse settlements with detailed diagnostics
      const { settlements, summary } = parseAllSettlements(jsonData);
      
      const extendedSummary: ExtendedImportSummary = {
        ...summary,
        dataSource: 'detalhes_pedido',
        hasLimitedData: hasLimitedData || false,
        statementsInfo,
      };
      
      setImportSummary(extendedSummary);

      if (settlements.length === 0) {
        toast.error('Nenhum registro válido encontrado no arquivo');
        setShowSummary(true);
        setIsProcessing(false);
        return;
      }

      // Delete existing if requested
      if (replaceExisting) {
        // Delete from both tables
        const [deleteSettlements, deleteStatements] = await Promise.all([
          supabase.from('tiktok_settlements').delete().eq('user_id', user.id),
          supabase.from('tiktok_statements').delete().eq('user_id', user.id),
        ]);

        if (deleteSettlements.error) {
          console.error('Error deleting existing settlements:', deleteSettlements.error);
          toast.error('Erro ao limpar dados anteriores');
          setIsProcessing(false);
          return;
        }
        if (deleteStatements.error) {
          console.error('Error deleting existing statements:', deleteStatements.error);
        }
      }

      // ALWAYS save Statements data to tiktok_statements table
      if (statementsInfo && statementsSheetName) {
        const statementsWs = workbook.Sheets[statementsSheetName];
        const statementsData = XLSX.utils.sheet_to_json(statementsWs, {
          defval: '',
          raw: false
        }) as Record<string, string>[];
        const { statements: parsedStatements } = parseStatementsSheet(statementsData);
        
        if (parsedStatements.length > 0) {
          const statementsToInsert = parsedStatements.map(s => ({
            user_id: user.id,
            statement_id: s.statement_id,
            statement_date: s.statement_date,
            payment_id: s.payment_id,
            status: s.status,
            currency: s.currency,
            total_settlement_amount: s.total_settlement_amount,
            net_sales: s.net_sales,
            fees_total: s.total_fees,
            shipping_total: s.shipping_total,
            adjustments: s.adjustment_amount,
          }));

          const { error: statementsError } = await supabase
            .from('tiktok_statements')
            .upsert(statementsToInsert, { onConflict: 'user_id,statement_id' });

          if (statementsError) {
            console.error('Error saving statements:', statementsError);
          } else {
            console.log(`✅ ${parsedStatements.length} statements salvos na tabela tiktok_statements`);
          }
        }
      }

      // Insert in batches
      const batchSize = 100;
      let insertedCount = 0;
      let insertErrors = 0;

      for (let i = 0; i < settlements.length; i += batchSize) {
        const batch = settlements.slice(i, i + batchSize).map(settlement => ({
          ...settlement,
          user_id: user.id,
        }));
        // When replaceExisting=true, we already deleted everything, use simple INSERT
        // When replaceExisting=false, use UPSERT to merge new data without duplicates
        const { error: insertError } = replaceExisting 
          ? await supabase.from('tiktok_settlements').insert(batch)
          : await supabase.from('tiktok_settlements').upsert(batch, { 
              onConflict: 'user_id,order_id,sku_id',
              ignoreDuplicates: false 
            });

        if (insertError) {
          console.error('Error inserting settlements batch:', insertError);
          insertErrors++;
        } else {
          insertedCount += batch.length;
          setProcessedCount(insertedCount);
        }
      }

      setShowSummary(true);

      if (hasLimitedData) {
        toast.warning(`${insertedCount} pedidos importados. Atenção: apenas os pedidos do último pagamento estão disponíveis no detalhe.`);
      } else if (insertErrors > 0) {
        toast.warning(`${insertedCount} registros importados com ${insertErrors} erros`);
      } else {
        toast.success(`${insertedCount} registros de pagamento importados com sucesso!`);
      }
      
      // Navigate after a delay to let user see summary
      setTimeout(() => {
        navigate('/tiktok/pagamentos');
      }, 4000);
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error('Erro ao processar arquivo');
    } finally {
      setIsProcessing(false);
    }
  }, [user?.id, replaceExisting, navigate]);

  const [multiFileQueue, setMultiFileQueue] = useState<File[]>([]);
  const [multiFileProgress, setMultiFileProgress] = useState({ current: 0, total: 0, results: [] as { name: string; success: boolean; count: number }[] });

  const processMultipleFiles = useCallback(async (files: File[]) => {
    setMultiFileQueue(files);
    setMultiFileProgress({ current: 0, total: files.length, results: [] });
    
    for (let i = 0; i < files.length; i++) {
      setMultiFileProgress(prev => ({ ...prev, current: i + 1 }));
      
      try {
        await processFile(files[i]);
        setMultiFileProgress(prev => ({
          ...prev,
          results: [...prev.results, { name: files[i].name, success: true, count: processedCount }]
        }));
      } catch (error) {
        setMultiFileProgress(prev => ({
          ...prev,
          results: [...prev.results, { name: files[i].name, success: false, count: 0 }]
        }));
      }
      
      // Small delay between files to avoid rate limiting
      if (i < files.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    setMultiFileQueue([]);
    toast.success(`${files.length} planilhas processadas!`);
    
    setTimeout(() => {
      navigate('/tiktok/pagamentos');
    }, 2000);
  }, [processFile, processedCount, navigate]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'));
    if (files.length > 1) {
      processMultipleFiles(files);
    } else if (files.length === 1) {
      processFile(files[0]);
    }
  }, [processFile, processMultipleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files).filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'));
    if (fileArray.length > 1) {
      processMultipleFiles(fileArray);
    } else if (fileArray.length === 1) {
      processFile(fileArray[0]);
    }
  }, [processFile, processMultipleFiles]);

  return (
    <AppLayout>
      <motion.div
        className="space-y-6"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <motion.div variants={fadeInUp} className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Upload de Pagamentos TikTok
          </h1>
          <p className="text-gray-600 mt-1">
            Importe o relatório de pagamentos (Income) do TikTok Shop para visualizar o detalhamento de recebimentos
          </p>
        </motion.div>

        <motion.div variants={fadeInUp}>
          <Card className="border border-blue-200 shadow-lg bg-white">
            <CardHeader className="bg-blue-50 border-b border-blue-200">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                Importar Relatório de Pagamentos
              </CardTitle>
              <CardDescription className="text-gray-600">
                Faça o download do relatório "Income" no Seller Center do TikTok Shop e importe aqui
              </CardDescription>
            </CardHeader>
            <br />
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Switch
                    id="replace-existing"
                    checked={replaceExisting}
                    onCheckedChange={setReplaceExisting}
                  />
                  <Label htmlFor="replace-existing" className={replaceExisting ? "text-red-600 font-medium" : "text-gray-900"}>
                    {replaceExisting ? "⚠️ Substituir todos os pagamentos anteriores" : "Adicionar aos pagamentos existentes"}
                  </Label>
                </div>
                
                {replaceExisting && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                    <div className="text-sm text-red-700">
                      <p className="font-medium">Atenção: Todos os dados de pagamentos serão apagados!</p>
                      <p className="text-red-600 mt-1">
                        Isso removerá permanentemente todos os pagamentos já importados. 
                        Desative esta opção se deseja acumular dados de múltiplas planilhas.
                      </p>
                    </div>
                  </div>
                )}
                
                {!replaceExisting && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <div className="text-sm text-green-700">
                      <p className="font-medium">Modo acumulativo ativado</p>
                      <p className="text-green-600 mt-1">
                        Os novos pagamentos serão adicionados aos existentes. Duplicatas serão atualizadas automaticamente.
                      </p>
                    </div>
                  </div>
                )}
              </div>

                          <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
                  isDragging 
                    ? 'border-blue-600 bg-blue-50 scale-[1.02]' 
                    : 'border-blue-200 hover:border-blue-500 hover:bg-blue-25'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">Processando arquivo...</p>
                      <p className="text-sm text-gray-600">
                        {processedCount} registros importados
                      </p>
                    </div>
                  </div>
                ) : multiFileQueue.length > 0 ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                    <div className="text-center">
                      <p className="font-medium text-gray-900">Processando múltiplas planilhas...</p>
                      <p className="text-sm text-gray-600">
                        {multiFileProgress.current} de {multiFileProgress.total} planilhas
                      </p>
                      {multiFileProgress.results.length > 0 && (
                        <div className="mt-2 text-xs text-gray-600">
                          {multiFileProgress.results.map((r, i) => (
                            <div key={i} className="flex items-center gap-1 justify-center">
                              {r.success ? <CheckCircle className="h-3 w-3 text-green-500" /> : <AlertCircle className="h-3 w-3 text-red-500" />}
                              <span>{r.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className={`
                      mx-auto h-16 w-16 rounded-full flex items-center justify-center transition-colors
                      ${isDragging ? 'bg-blue-600 text-white' : 'bg-blue-100'}
                    `}>
                      <Upload className="h-8 w-8" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        {isDragging ? 'Solte o arquivo aqui' : 'Arraste arquivos XLSX aqui ou clique para selecionar'}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Você pode selecionar <strong>múltiplas planilhas</strong> de uma vez
                      </p>
                    </div>
                    <Button
                      asChild
                      variant="outline"
                      className="border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept=".xlsx,.xls"
                          multiple
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                        Selecionar Arquivos
                      </label>
                    </Button>
                  </div>
                )}
              </div>

              {/* Import Summary */}
              {showSummary && importSummary && (
                <motion.div variants={fadeInUp} className="space-y-4">
                  {/* Limited Data Warning */}
                  {importSummary.hasLimitedData && importSummary.statementsInfo && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-medium mb-2 flex items-center gap-2 text-yellow-800">
                        <AlertTriangle className="h-4 w-4" />
                        Dados Parciais Detectados
                      </h4>
                      <p className="text-sm text-yellow-700 mb-2">
                        O relatório Income do TikTok mostra <strong>apenas os pedidos do último pagamento</strong> na aba "Order details".
                      </p>
                      <div className="text-sm space-y-1 text-yellow-700">
                        <p>• Pedidos importados: <strong>{importSummary.validRecords}</strong></p>
                        <p>• Total de pagamentos no período: <strong>{importSummary.statementsInfo.validRecords}</strong></p>
                        <p>• Valor total do período: <strong>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(importSummary.statementsInfo.totalSettlementAmount)}
                        </strong></p>
                      </div>
                      <p className="text-xs text-yellow-600 mt-2">
                        💡 Para análise histórica completa, exporte relatórios periodicamente (ex: semanal ou após cada pagamento).
                      </p>
                    </div>
                  )}

                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="font-medium mb-3 flex items-center gap-2 text-blue-800">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Resumo da Importação
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Total no arquivo</p>
                        <p className="font-semibold text-lg text-gray-900">{importSummary.totalRows}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Pedidos importados</p>
                        <p className="font-semibold text-lg text-green-600">{importSummary.validRecords}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Rejeitados</p>
                        <p className="font-semibold text-lg text-yellow-600">{importSummary.rejectedRecords}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Fonte de dados</p>
                        <p className="font-semibold text-lg text-gray-900">Order details</p>
                      </div>
                    </div>
                  </div>

                  {/* Rejection Reasons */}
                  {importSummary.rejectedRecords > 0 && Object.keys(importSummary.rejectionReasons).length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="font-medium mb-2 flex items-center gap-2 text-yellow-800">
                        <FileWarning className="h-4 w-4" />
                        Motivos de Rejeição
                      </h4>
                      <ul className="text-sm space-y-1">
                        {Object.entries(importSummary.rejectionReasons).map(([reason, count]) => (
                          <li key={reason} className="flex justify-between text-yellow-700">
                            <span>{reason}</span>
                            <span className="font-medium">{count} linhas</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Missing Columns Warning */}
                  {importSummary.missingColumns.length > 10 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium mb-2 flex items-center gap-2 text-blue-800">
                        <Info className="h-4 w-4" />
                        Colunas não encontradas (opcional)
                      </h4>
                      <p className="text-sm text-blue-700">
                        Algumas colunas esperadas não foram encontradas no arquivo. 
                        Isso pode ser normal dependendo do tipo de relatório exportado.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              <motion.div variants={fadeInUp} className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-medium mb-2 flex items-center gap-2 text-blue-800">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  Como exportar o relatório de pagamentos
                </h4>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Acesse o Seller Center do TikTok Shop</li>
                  <li>Vá em Finance → Income</li>
                  <li>Selecione o período desejado</li>
                  <li>Clique em "Export" para baixar o arquivo XLSX</li>
                  <li>Importe o arquivo aqui</li>
                </ol>
              </motion.div>

              <motion.div variants={fadeInUp} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2 text-blue-800">
                  <Info className="h-4 w-4" />
                  Limitação do relatório TikTok
                </h4>
                <p className="text-sm text-blue-700">
                  O relatório "Income" do TikTok mostra o <strong>detalhamento de pedidos apenas do último pagamento</strong>. 
                  Para ter dados históricos completos por pedido, exporte e importe relatórios periodicamente 
                  (recomendamos exportar após cada pagamento recebido).
                </p>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}

export default function TikTokPagamentosUpload() {
  return (
    <ProtectedRoute>
      <TikTokPagamentosUploadContent />
    </ProtectedRoute>
  );
}