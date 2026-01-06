import React from 'react';
import { DRESection, DRELineItem, formatCurrency, formatPercent } from '@/lib/dre-calculations';
import { cn } from '@/lib/utils';

interface DRETableProps {
  sections: DRESection[];
}

export function DRETable({ sections }: DRETableProps) {
  const renderLineItem = (item: DRELineItem, index: number) => {
    const isPositive = item.value >= 0;
    const valueClass = cn(
      'text-right font-mono',
      item.isTotal && 'font-bold text-base',
      item.isSubtotal && 'font-semibold',
      item.isHighlight && (isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'),
      !item.isHighlight && !item.isTotal && !item.isSubtotal && 'text-muted-foreground'
    );

    const labelClass = cn(
      'text-left',
      item.indent && `pl-${item.indent * 4}`,
      item.isTotal && 'font-bold text-base',
      item.isSubtotal && 'font-semibold'
    );

    return (
      <tr 
        key={index} 
        className={cn(
          'border-b border-border/50 transition-colors',
          item.isTotal && 'bg-muted/30',
          item.isSubtotal && 'bg-muted/20',
          !item.isTotal && !item.isSubtotal && 'hover:bg-muted/10'
        )}
      >
        <td className={cn('py-2 px-4', labelClass)}>
          {item.indent && <span className="inline-block" style={{ width: `${item.indent * 16}px` }} />}
          {item.label}
        </td>
        <td className={cn('py-2 px-4', valueClass)}>
          {formatCurrency(item.value)}
        </td>
        <td className={cn('py-2 px-4 text-right text-muted-foreground', item.isTotal && 'font-semibold')}>
          {item.percentage !== undefined ? formatPercent(item.percentage) : ''}
        </td>
      </tr>
    );
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr className="border-b-2 border-border bg-muted/50">
            <th className="text-left py-3 px-4 font-semibold" style={{ width: '50%' }}>Descrição</th>
            <th className="text-right py-3 px-4 font-semibold" style={{ width: '25%' }}>Valor (R$)</th>
            <th className="text-right py-3 px-4 font-semibold" style={{ width: '25%' }}>% Receita</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((section, sectionIndex) => (
            <React.Fragment key={sectionIndex}>
              {/* Section Header */}
              <tr className="bg-primary/5 border-b border-border">
                <td colSpan={3} className="py-2.5 px-4 font-bold text-primary text-sm uppercase tracking-wide">
                  {section.title}
                </td>
              </tr>
              
              {/* Section Items */}
              {section.items.map((item, itemIndex) => renderLineItem(item, itemIndex))}
              
              {/* Section Total */}
              {section.total && renderLineItem(section.total, -1)}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
