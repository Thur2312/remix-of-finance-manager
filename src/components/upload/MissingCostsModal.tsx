import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, DollarSign, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export interface MissingSku {
  sku: string;
  nome_produto: string;
  quantidade: number;
}

interface MissingCostsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missingSkus: MissingSku[];
  onSubmit: (costs: Record<string, number>) => Promise<void>;
  isLoading?: boolean;
}

export function MissingCostsModal({
  open,
  onOpenChange,
  missingSkus,
  onSubmit,
  isLoading = false,
}: MissingCostsModalProps) {
  const [costs, setCosts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleCostChange = (sku: string, value: string) => {
    // Allow only numbers and comma/dot
    const cleanValue = value.replace(/[^\d.,]/g, '').replace(',', '.');
    setCosts(prev => ({ ...prev, [sku]: cleanValue }));
    
    // Clear error when user types
    if (errors[sku]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[sku];
        return newErrors;
      });
    }
  };

  const validateAndSubmit = async () => {
    const newErrors: Record<string, string> = {};
    const parsedCosts: Record<string, number> = {};

    for (const item of missingSkus) {
      const value = costs[item.sku];
      if (!value || value.trim() === '') {
        newErrors[item.sku] = 'Custo é obrigatório';
        continue;
      }

      const parsed = parseFloat(value);
      if (isNaN(parsed) || parsed < 0) {
        newErrors[item.sku] = 'Valor inválido';
        continue;
      }

      parsedCosts[item.sku] = parsed;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSubmit(parsedCosts);
  };

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] border border-blue-200 bg-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
        >
          <DialogHeader className="bg-blue-50 border-b border-blue-200 -m-6 mb-0 p-6 rounded-t-lg">
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Custos Não Cadastrados
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Os seguintes SKUs não possuem custo cadastrado. Por favor, informe o custo unitário para cada produto para calcular o lucro corretamente.
            </DialogDescription>
          </DialogHeader>

          <motion.div 
            className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mx-6 mt-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              Sem o custo unitário, o lucro será calculado como se o custo fosse zero, resultando em valores incorretos.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <ScrollArea className="max-h-[400px] pr-4 mx-6">
              <Table className="border border-blue-200 rounded-lg overflow-hidden">
                <TableHeader className="bg-blue-50">
                  <TableRow>
                    <TableHead className="text-gray-900">SKU</TableHead>
                    <TableHead className="text-gray-900">Produto</TableHead>
                    <TableHead className="text-center text-gray-900">Qtd</TableHead>
                    <TableHead className="text-right w-[140px] text-gray-900">Custo Unitário (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missingSkus.map((item, index) => (
                    <motion.tr 
                      key={item.sku}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      className="border-b border-blue-200 hover:bg-blue-25"
                    >
                      <TableCell className="font-mono text-xs text-gray-900">{item.sku || '(sem SKU)'}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-gray-900">{item.nome_produto}</TableCell>
                      <TableCell className="text-center text-gray-900">{item.quantidade}</TableCell>
                      <TableCell className="text-right">
                        <div className="space-y-1">
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={costs[item.sku] || ''}
                            onChange={(e) => handleCostChange(item.sku, e.target.value)}
                            className={`w-[120px] text-right border-blue-200 focus:border-blue-500 ${
                              errors[item.sku] ? 'border-red-500 focus-visible:ring-red-500' : ''
                            }`}
                            disabled={isLoading}
                          />
                          {errors[item.sku] && (
                            <p className="text-xs text-red-600">{errors[item.sku]}</p>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </motion.div>

          <DialogFooter className="gap-2 sm:gap-0 -m-6 mt-0 p-6 bg-blue-50 border-t border-blue-200 rounded-b-lg">
            <Button variant="outline" onClick={handleClose} disabled={isLoading} className="border-blue-200 text-blue-700 hover:bg-blue-50">
              Cancelar
            </Button>
            <Button onClick={validateAndSubmit} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar e Continuar'
              )}
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}