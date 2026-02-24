import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Card, Button } from '../components/ui';
import { formatCurrency } from '../utils';
import { Plus, ShoppingBag, AlertTriangle, TrendingUp, ArrowRight, Tag, Clock, Wallet } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { orders, products, batches } = useStore();

  const today = new Date();
  const todayOrders = orders.filter(o => {
    if (!o.date) return false;
    const orderDate = new Date(o.date);
    return orderDate.toDateString() === today.toDateString();
  });
  const todaySales = todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  
  // Calculate low stock based on total stock of product vs minStockAlert
  const lowStockItems = products.filter(p => {
    const totalStock = batches.filter(b => b.productId === p.id).reduce((sum, b) => sum + b.stock, 0);
    return totalStock < (p.minStockAlert || 5);
  });

  // Expiry Logic
  const criticalThreshold = new Date(today);
  criticalThreshold.setDate(today.getDate() + 30);
  const nearThreshold = new Date(today);
  nearThreshold.setDate(today.getDate() + 90);

  let criticalCount = 0;
  let nearCount = 0;

  batches.forEach(b => {
    if (b.stock > 0) {
      const exp = new Date(b.expiryDate);
      if (exp < today) return; // Expired
      if (exp <= criticalThreshold) criticalCount++;
      else if (exp <= nearThreshold) nearCount++;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-500">
          {today.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 bg-blue-50 border-blue-100">
          <div className="flex items-center gap-2 text-blue-700 mb-1">
            <TrendingUp size={16} />
            <span className="text-xs font-semibold uppercase">Today Sales</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(todaySales)}</p>
          <p className="text-xs text-blue-600 mt-1">{todayOrders.length} orders today</p>
        </Card>

        <Card className="p-4 bg-orange-50 border-orange-100" onClick={() => navigate('/inventory')}>
          <div className="flex items-center gap-2 text-orange-700 mb-1">
            <AlertTriangle size={16} />
            <span className="text-xs font-semibold uppercase">Low Stock</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{lowStockItems.length}</p>
          <p className="text-xs text-orange-600 mt-1">Items need attention</p>
        </Card>
      </div>

      {/* Expiry / Clearance Action Widget */}
      {(criticalCount > 0 || nearCount > 0) && (
        <Card className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 cursor-pointer" onClick={() => navigate('/expiry-discount')}>
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2 text-red-700 mb-1">
                <Tag size={16} />
                <span className="text-xs font-semibold uppercase">Clearance Action</span>
              </div>
              <div className="flex gap-3 mt-1">
                 {criticalCount > 0 && (
                    <div className="flex items-center gap-1">
                        <span className="text-lg font-bold text-red-600">{criticalCount}</span>
                        <span className="text-xs text-red-500">Critical</span>
                    </div>
                 )}
                 {nearCount > 0 && (
                    <div className="flex items-center gap-1">
                        <span className="text-lg font-bold text-orange-600">{nearCount}</span>
                        <span className="text-xs text-orange-500">Near Expiry</span>
                    </div>
                 )}
              </div>
              <p className="text-[10px] text-gray-500 mt-1">Apply discounts to clear stock</p>
            </div>
            <div className="bg-white p-2 rounded-full shadow-sm text-red-600">
                <ArrowRight size={20} />
            </div>
          </div>
        </Card>
      )}

      {/* Primary Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button 
          size="lg" 
          className="h-14 shadow-md shadow-blue-100"
          onClick={() => navigate('/pos')}
        >
          <Plus className="mr-2" size={20} />
          New Bill
        </Button>
        <Button 
          variant="secondary" 
          size="lg" 
          className="h-14 bg-white border border-gray-200 shadow-sm"
          onClick={() => navigate('/inventory?new=true')}
        >
          <Plus className="mr-2" size={20} />
          Add Item
        </Button>
      </div>

      {/* Recent Orders Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Orders</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/orders')} className="text-blue-600">
            View All <ArrowRight size={14} className="ml-1" />
          </Button>
        </div>
        
        {orders.length === 0 ? (
          <Card className="p-8 text-center text-gray-500 bg-gray-50 border-dashed">
            <ShoppingBag className="mx-auto mb-2 opacity-20" size={32} />
            <p className="text-sm">No orders yet</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 3).map(order => (
              <Card key={order.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">#{order.id.slice(-4)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      order.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {order.items.length} items • {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className="font-semibold text-gray-900">{formatCurrency(order.total)}</span>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Secondary Actions Grid */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Quick Access</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Khata', path: '/khata', color: 'bg-blue-50 text-blue-700', icon: <Wallet size={20} /> },
            { label: 'Daily Ledger', path: '/daily-ledger', color: 'bg-green-50 text-green-700', icon: <Clock size={20} /> },
            { label: 'Customers', path: '/customers', color: 'bg-purple-50 text-purple-700', icon: <ShoppingBag size={20} /> },
            { label: 'Expenses', path: '/expenses', color: 'bg-pink-50 text-pink-700', icon: <TrendingUp size={20} /> },
            { label: 'Reports', path: '/reports', color: 'bg-teal-50 text-teal-700', icon: <ArrowRight size={20} /> },
            { label: 'Expiry', path: '/expiry-discount', color: 'bg-red-50 text-red-700', icon: <Tag size={20} /> },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 ${item.color} transition-transform active:scale-95`}
            >
              {item.icon}
              <span className="font-medium text-sm text-center leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
