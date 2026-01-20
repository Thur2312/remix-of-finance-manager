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
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Custos Não Cadastrados
          </DialogTitle>
          <DialogDescription>
            Os seguintes SKUs não possuem custo cadastrado. Por favor, informe o custo unitário para cada produto para calcular o lucro corretamente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Sem o custo unitário, o lucro será calculado como se o custo fosse zero, resultando em valores incorretos.
          </p>
        </div>

        <ScrollArea className="max-h-[400px] pr-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-center">Qtd</TableHead>
                <TableHead className="text-right w-[140px]">Custo Unitário (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {missingSkus.map((item) => (
                <TableRow key={item.sku}>
                  <TableCell className="font-mono text-xs">{item.sku || '(sem SKU)'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{item.nome_produto}</TableCell>
                  <TableCell className="text-center">{item.quantidade}</TableCell>
                  <TableCell className="text-right">
                    <div className="space-y-1">
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={costs[item.sku] || ''}
                        onChange={(e) => handleCostChange(item.sku, e.target.value)}
                        className={`w-[120px] text-right ${
                          errors[item.sku] ? 'border-destructive focus-visible:ring-destructive' : ''
                        }`}
                        disabled={isLoading}
                      />
                      {errors[item.sku] && (
                        <p className="text-xs text-destructive">{errors[item.sku]}</p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={validateAndSubmit} disabled={isLoading}>
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
      </DialogContent>
    </Dialog>
  );
}
