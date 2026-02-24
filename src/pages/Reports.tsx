import React from 'react';
import { useStore } from '../context/StoreContext';
import { Card } from '../components/ui';
import { formatCurrency } from '../utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Reports() {
  const { orders, expenses } = useStore();

  const salesData = React.useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dayOrders = orders.filter(o => o.date.startsWith(date));
      const total = dayOrders.reduce((sum, o) => sum + o.total, 0);
      return {
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        sales: total
      };
    });
  }, [orders]);

  const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
  const totalTax = orders.reduce((sum, o) => sum + o.tax, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalSales - totalExpenses;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Reports</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs text-gray-500 uppercase">Total Sales</p>
          <p className="text-xl font-bold text-blue-600">{formatCurrency(totalSales)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 uppercase">Net Profit</p>
          <p className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(netProfit)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 uppercase">Total Tax (GST)</p>
          <p className="text-xl font-bold text-gray-700">{formatCurrency(totalTax)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 uppercase">Expenses</p>
          <p className="text-xl font-bold text-pink-600">{formatCurrency(totalExpenses)}</p>
        </Card>
      </div>

      {/* Chart */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Last 7 Days Sales</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesData}>
              <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), 'Sales']}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
