import React from 'react';
import { DRESection, DRELineItem, formatCurrency, formatPercent } from '@/lib/dre-calculations';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface DRETableProps {
  sections: DRESection[];
}

export function DRETable({ sections }: DRETableProps) {
  const renderLineItem = (item: DRELineItem, index: number) => {
    const isPositive = item.value >= 0;
    const valueClass = cn(
      'text-right font-mono',
      item.isTotal && 'font-bold text-base text-gray-900',
      item.isSubtotal && 'font-semibold text-gray-900',
      item.isHighlight && (isPositive ? 'text-green-600' : 'text-red-600'),
      !item.isHighlight && !item.isTotal && !item.isSubtotal && 'text-gray-600'
    );

    const labelClass = cn(
      'text-left text-gray-900',
      item.indent && `pl-${item.indent * 4}`,
      item.isTotal && 'font-bold text-base',
      item.isSubtotal && 'font-semibold'
    );

    return (
      <motion.tr 
        key={index} 
        className={cn(
          'border-b border-blue-200 transition-colors',
          item.isTotal && 'bg-blue-50',
          item.isSubtotal && 'bg-blue-25',
          !item.isTotal && !item.isSubtotal && 'hover:bg-blue-25'
        )}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: index * 0.05 }}
      >
        <td className={cn('py-2 px-4', labelClass)}>
          {item.indent && <span className="inline-block" style={{ width: `${item.indent * 16}px` }} />}
          {item.label}
        </td>
        <td className={cn('py-2 px-4', valueClass)}>
          {formatCurrency(item.value)}
        </td>
        <td className={cn('py-2 px-4 text-right text-gray-600', item.isTotal && 'font-semibold text-gray-900')}>
          {item.percentage !== undefined ? formatPercent(item.percentage) : ''}
        </td>
      </motion.tr>
    );
  };

  return (
    <motion.div 
      className="w-full overflow-x-auto bg-white border border-blue-200 rounded-lg shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
        <thead>
          <motion.tr 
            className="border-b-2 border-blue-200 bg-blue-50"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <th className="text-left py-3 px-4 font-semibold text-gray-900" style={{ width: '50%' }}>Descrição</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-900" style={{ width: '25%' }}>Valor (R$)</th>
            <th className="text-right py-3 px-4 font-semibold text-gray-900" style={{ width: '25%' }}>% Receita</th>
          </motion.tr>
        </thead>
        <tbody>
          {sections.map((section, sectionIndex) => (
            <React.Fragment key={sectionIndex}>
              {/* Section Header */}
              <motion.tr 
                className="bg-blue-100 border-b border-blue-200"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: sectionIndex * 0.1 }}
              >
                <td colSpan={3} className="py-2.5 px-4 font-bold text-blue-700 text-sm uppercase tracking-wide">
                  {section.title}
                </td>
              </motion.tr>
              
              {/* Section Items */}
              {section.items.map((item, itemIndex) => renderLineItem(item, itemIndex))}
              
              {/* Section Total */}
              {section.total && renderLineItem(section.total, -1)}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}