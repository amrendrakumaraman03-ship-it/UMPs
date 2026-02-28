import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Card, Button, Input, Badge } from '../components/ui';
import { formatCurrency } from '../utils';
import { Download, FileText, Calendar, Filter, ArrowLeft, TrendingUp, PieChart, BarChart } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function Reports() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { orders, expenses, products, batches } = useStore();
  const [reportType, setReportType] = useState<'sales' | 'gst' | 'stock'>('sales');
  
  const [dateRange, setDateRange] = useState({
    from: searchParams.get('from') || new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    to: searchParams.get('to') || new Date().toISOString().split('T')[0]
  });

  // Update date range if URL params change
  useEffect(() => {
      const fromParam = searchParams.get('from');
      const toParam = searchParams.get('to');
      if (fromParam && toParam) {
          setDateRange({ from: fromParam, to: toParam });
      }
  }, [searchParams]);

  // Filter data based on date range
  const filteredOrders = orders.filter(o => {
    const orderDate = new Date(o.date);
    const oDate = orderDate.getFullYear() + '-' + String(orderDate.getMonth() + 1).padStart(2, '0') + '-' + String(orderDate.getDate()).padStart(2, '0');
    return oDate >= dateRange.from && oDate <= dateRange.to && o.status !== 'Cancelled';
  });

  // Sales Report Calculations
  const totalSales = filteredOrders.reduce((sum, o) => sum + o.total, 0);
  const totalTax = filteredOrders.reduce((sum, o) => sum + o.tax, 0);
  const totalOrders = filteredOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  // GST Report Calculations
  const gstBreakdown = filteredOrders.reduce((acc, o) => {
      o.items.forEach(item => {
          const rate = item.gstRate || 0;
          const taxableValue = (item.finalPrice * item.quantity) / (1 + rate/100);
          const taxAmount = (item.finalPrice * item.quantity) - taxableValue;
          
          if (!acc[rate]) acc[rate] = { taxable: 0, tax: 0 };
          acc[rate].taxable += taxableValue;
          acc[rate].tax += taxAmount;
      });
      return acc;
  }, {} as Record<number, { taxable: number, tax: number }>);

  // Stock Audit Calculations
  const stockValue = batches.reduce((sum, b) => sum + (b.stock * b.purchaseRate), 0);
  const mrpValue = batches.reduce((sum, b) => sum + (b.stock * b.mrp), 0);
  const lowStockItems = products.filter(p => {
      const totalStock = batches.filter(b => b.productId === p.id).reduce((sum, b) => sum + b.stock, 0);
      return totalStock <= p.minStockAlert;
  }).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold text-gray-900">Reports & Analytics</h2>
      </div>

      {/* Report Selector */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => setReportType('sales')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${reportType === 'sales' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
              Sales
          </button>
          <button 
            onClick={() => setReportType('gst')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${reportType === 'gst' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
              GST
          </button>
          <button 
            onClick={() => setReportType('stock')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${reportType === 'stock' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
              Stock Audit
          </button>
      </div>

      {/* Date Filter */}
      {reportType !== 'stock' && (
          <Card className="p-4 flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                  <label className="text-xs text-gray-500 block mb-1">From</label>
                  <Input type="date" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} />
              </div>
              <div className="flex-1 w-full">
                  <label className="text-xs text-gray-500 block mb-1">To</label>
                  <Input type="date" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} />
              </div>
              <Button variant="outline" className="w-full sm:w-auto">
                  <Filter size={16} className="mr-2" /> Apply
              </Button>
          </Card>
      )}

      {/* Sales Report View */}
      {reportType === 'sales' && (
          <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                  <Card className="p-4 bg-blue-50 border-blue-100">
                      <p className="text-xs text-blue-600 font-semibold uppercase">Total Sales</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSales)}</p>
                  </Card>
                  <Card className="p-4 bg-green-50 border-green-100">
                      <p className="text-xs text-green-600 font-semibold uppercase">Total Tax</p>
                      <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalTax)}</p>
                  </Card>
              </div>

              <Card className="p-4">
                  <h3 className="font-bold text-gray-900 mb-4">Sales Performance</h3>
                  <div className="space-y-4">
                      <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">Total Orders</span>
                          <span className="font-bold">{totalOrders}</span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">Avg. Order Value</span>
                          <span className="font-bold">{formatCurrency(avgOrderValue)}</span>
                      </div>
                  </div>
              </Card>

              <Button className="w-full h-12 bg-blue-600 text-white">
                  <Download size={20} className="mr-2" /> Download Sales Report (PDF)
              </Button>
          </div>
      )}

      {/* GST Report View */}
      {reportType === 'gst' && (
          <div className="space-y-4">
              <Card className="overflow-hidden">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                          <tr>
                              <th className="p-4">GST Rate</th>
                              <th className="p-4">Taxable Value</th>
                              <th className="p-4">GST Amount</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {Object.entries(gstBreakdown).map(([rate, data]: [string, any]) => (
                              <tr key={rate}>
                                  <td className="p-4 font-bold">{rate}%</td>
                                  <td className="p-4">{formatCurrency(data.taxable)}</td>
                                  <td className="p-4 text-blue-600 font-bold">{formatCurrency(data.tax)}</td>
                              </tr>
                          ))}
                          <tr className="bg-gray-50 font-bold">
                              <td className="p-4">Total</td>
                              <td className="p-4">{formatCurrency((Object.values(gstBreakdown) as any[]).reduce((s: number, d: any) => s + d.taxable, 0))}</td>
                              <td className="p-4 text-blue-700">{formatCurrency(totalTax)}</td>
                          </tr>
                      </tbody>
                  </table>
              </Card>
              <Button className="w-full h-12 bg-blue-600 text-white">
                  <Download size={20} className="mr-2" /> Download GST Summary (Excel)
              </Button>
          </div>
      )}

      {/* Stock Audit View */}
      {reportType === 'stock' && (
          <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                  <Card className="p-4 bg-purple-50 border-purple-100">
                      <p className="text-xs text-purple-600 font-semibold uppercase">Inventory Value (Cost)</p>
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(stockValue)}</p>
                  </Card>
                  <Card className="p-4 bg-orange-50 border-orange-100">
                      <p className="text-xs text-orange-600 font-semibold uppercase">Inventory Value (MRP)</p>
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(mrpValue)}</p>
                  </Card>
              </div>

              <Card className="p-4">
                  <h3 className="font-bold text-gray-900 mb-4">Stock Health</h3>
                  <div className="space-y-4">
                      <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">Total Products</span>
                          <span className="font-bold">{products.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">Low Stock Items</span>
                          <span className="font-bold text-red-600">{lowStockItems}</span>
                      </div>
                      <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">Total Batches</span>
                          <span className="font-bold">{batches.length}</span>
                      </div>
                  </div>
              </Card>

              <Button className="w-full h-12 bg-blue-600 text-white">
                  <FileText size={20} className="mr-2" /> Generate Full Stock Audit
              </Button>
          </div>
      )}
    </div>
  );
}
