import { useState, useRef, useCallback, useEffect, memo } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseCurrencyInput } from '@/lib/numeric-validation';

interface EditableCostCellProps {
  sku: string;
  nomeProduto: string;
  initialCost: number;
  onCostSave: (sku: string, nomeProduto: string, newCost: number) => Promise<void>;
  // Version counter to force sync from parent (incremented on batch edit)
  syncVersion?: number;
}

export const EditableCostCell = memo(function EditableCostCell({ 
  sku, 
  nomeProduto,
  initialCost, 
  onCostSave,
  syncVersion = 0
}: EditableCostCellProps) {
  // Initialize with initialCost only once
  const [localValue, setLocalValue] = useState(() => 
    initialCost > 0 ? initialCost.toFixed(2).replace('.', ',') : ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  // Track if user has ever edited - once true, never sync from parent (except batch)
  const hasEverEdited = useRef(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastSyncVersion = useRef(syncVersion);

  // Sync from parent when syncVersion changes (batch edit) or SKU changes
  useEffect(() => {
    // If syncVersion changed, force sync regardless of hasEverEdited
    if (syncVersion !== lastSyncVersion.current) {
      lastSyncVersion.current = syncVersion;
      setLocalValue(initialCost > 0 ? initialCost.toFixed(2).replace('.', ',') : '');
      hasEverEdited.current = false; // Reset edit flag after batch sync
      return;
    }
    
    // Only sync from parent if user has NEVER edited this field
    if (hasEverEdited.current) return;
    setLocalValue(initialCost > 0 ? initialCost.toFixed(2).replace('.', ',') : '');
  }, [sku, syncVersion, initialCost]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Mark as edited - this prevents any future sync from parent
    hasEverEdited.current = true;
    
    setLocalValue(value);
    setIsSaved(false);

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Parse and validate value
    const result = parseCurrencyInput(value);
    const numValue = result.isValid ? result.value : 0;

    // Set debounced save
    debounceTimer.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await onCostSave(sku, nomeProduto, numValue);
        setIsSaved(true);
        // Clear saved indicator after 2 seconds
        setTimeout(() => setIsSaved(false), 2000);
      } finally {
        setIsSaving(false);
      }
    }, 800);
  }, [sku, nomeProduto, onCostSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const numericValue = parseFloat(localValue.replace(',', '.')) || 0;
  const hasNoCost = numericValue === 0 && localValue === '';

  return (
    <div className="relative flex items-center justify-end gap-1">
      <span className="text-muted-foreground text-xs">R$</span>
      <Input
        type="text"
        inputMode="decimal"
        value={localValue}
        onChange={handleChange}
        placeholder="0,00"
        className={cn(
          'w-20 h-8 text-right text-sm px-2',
          hasNoCost && 'border-warning bg-warning/10',
          isSaved && 'border-success bg-success/10'
        )}
      />
      {isSaving && (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground absolute -right-4" />
      )}
      {isSaved && !isSaving && (
        <Check className="h-3 w-3 text-success absolute -right-4" />
      )}
    </div>
  );
});
