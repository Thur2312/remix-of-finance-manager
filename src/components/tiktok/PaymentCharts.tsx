import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { motion } from 'framer-motion';

interface Settlement {
  statement_date: string | null;
  total_settlement_amount: number;
  total_fees: number;
  seller_discounts: number;
  platform_discounts: number;
  tiktok_commission_fee: number;
  sfp_service_fee: number;
  affiliate_commission: number;
  icms_difal: number;
  type: string | null;
}

interface PaymentChartsProps {
  settlements: Settlement[];
}

// Animações (alinhadas com Landing Page)
const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

export function PaymentCharts({ settlements }: PaymentChartsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Type breakdown (Orders vs Refunds vs Adjustments)
  const typeBreakdown = useMemo(() => {
    const types: Record<string, number> = {};
    
    settlements.forEach(s => {
      const type = s.type || 'Outros';
      const displayType = type === 'Order' ? 'Vendas' : 
                          type === 'Refund' ? 'Reembolsos' : 
                          type === 'Adjustment' ? 'Ajustes' : type;
      types[displayType] = (types[displayType] || 0) + Math.abs(s.total_settlement_amount || 0);
    });

    return Object.entries(types)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [settlements]);

  if (settlements.length === 0) return null;

  return (
    <motion.div 
      className="grid gap-4 md:grid-cols-2"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={stagger}
    >
      {/* Type Breakdown */}
      {typeBreakdown.length > 1 && (
        <motion.div variants={fadeInUp}>
          <Card className="bg-white border border-blue-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-900">Vendas vs Reembolsos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {typeBreakdown.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.name === 'Vendas' ? '#10b981' : entry.name === 'Reembolsos' ? '#ef4444' : '#f59e0b'} 
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}