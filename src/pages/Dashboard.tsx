import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Card, Button, Input } from '../components/ui';
import { formatCurrency } from '../utils';
import { Plus, ShoppingBag, AlertTriangle, TrendingUp, ArrowRight, Tag, Clock, Wallet, Globe, BarChart, Package, FilePlus, Search, X, FileText, RotateCcw, ScanLine, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { Product, Order } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const { orders, products, batches, addPurchaseOrder, returnOrder, syncStatus } = useStore();
  const [showQuickPO, setShowQuickPO] = useState(false);
  const [poSearch, setPoSearch] = useState('');
  const [poSelectedProduct, setPoSelectedProduct] = useState<Product | null>(null);
  const [poQuantity, setPoQuantity] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isConfirmingReturn, setIsConfirmingReturn] = useState(false);

  const today = new Date();
  const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

  const todayOrders = orders.filter(o => {
    if (!o.date) return false;
    const orderDate = new Date(o.date);
    return orderDate.toDateString() === today.toDateString() && o.status !== 'Cancelled';
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

  const handleQuickPOCreate = () => {
      if (!poSelectedProduct || !poQuantity) return;
      
      addPurchaseOrder({
          supplierName: 'Quick Order',
          items: [{
              productId: poSelectedProduct.id,
              productName: poSelectedProduct.name,
              quantity: Number(poQuantity)
          }],
          status: 'Draft'
      });
      
      setShowQuickPO(false);
      setPoSearch('');
      setPoSelectedProduct(null);
      setPoQuantity('');
      navigate('/inventory?tab=po');
  };

  const handleReturnOrder = () => {
      if (!selectedOrder) return;
      returnOrder(selectedOrder.id);
      setSelectedOrder(null);
      setIsConfirmingReturn(false);
  };

  const filteredPoProducts = products.filter(p => 
      p.name.toLowerCase().includes(poSearch.toLowerCase()) || 
      p.code.toLowerCase().includes(poSearch.toLowerCase())
  ).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs font-medium">
            {syncStatus === 'synced' && <Cloud size={14} className="text-green-500" />}
            {syncStatus === 'syncing' && <RefreshCw size={14} className="text-blue-500 animate-spin" />}
            {syncStatus === 'error' && <CloudOff size={14} className="text-red-500" />}
            <span className="text-gray-600">
              {syncStatus === 'synced' ? 'Synced' : syncStatus === 'syncing' ? 'Syncing...' : 'Offline'}
            </span>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {today.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 bg-blue-50 border-blue-100 cursor-pointer" onClick={() => navigate(`/reports?from=${todayStr}&to=${todayStr}`)}>
          <div className="flex items-center gap-2 text-blue-700 mb-1">
            <TrendingUp size={16} />
            <span className="text-xs font-semibold uppercase">Today Sales</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(todaySales)}</p>
          <div className="flex justify-between items-end mt-1">
            <p className="text-xs text-blue-600">{todayOrders.length} orders today</p>
            <span className="text-[10px] text-blue-400 bg-blue-100 px-1.5 py-0.5 rounded">Offline + Online</span>
          </div>
        </Card>

        <Card className="p-4 bg-orange-50 border-orange-100 cursor-pointer" onClick={() => navigate('/inventory?filter=low_stock')}>
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

      {/* Secondary Actions Grid */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Quick Access</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Khata', path: '/khata', color: 'bg-blue-50 text-blue-700', icon: <Wallet size={20} /> },
            { label: 'Daily Ledger', path: '/daily-ledger', color: 'bg-green-50 text-green-700', icon: <Clock size={20} /> },
            { label: 'Online Store', path: '/online-store', color: 'bg-orange-50 text-orange-700', icon: <Globe size={20} /> },
            { label: 'Reports', path: '/reports', color: 'bg-teal-50 text-teal-700', icon: <BarChart size={20} /> },
            { label: 'Inventory', path: '/inventory', color: 'bg-purple-50 text-purple-700', icon: <Package size={20} /> },
            { label: 'Purchase Orders', path: '/inventory?tab=po', color: 'bg-indigo-50 text-indigo-700', icon: <FileText size={20} /> },
            { label: 'Expenses', path: '/expenses', color: 'bg-pink-50 text-pink-700', icon: <TrendingUp size={20} /> },
            { label: 'Purchase Invoice', path: '/invoice-upload', color: 'bg-rose-50 text-rose-700', icon: <ScanLine size={20} /> },
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
          <button
              onClick={() => setShowQuickPO(true)}
              className="p-4 rounded-xl flex flex-col items-center justify-center gap-2 bg-indigo-50 text-indigo-700 transition-transform active:scale-95"
            >
              <FilePlus size={20} />
              <span className="font-medium text-sm text-center leading-tight">Quick PO</span>
          </button>
        </div>
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
              <Card 
                key={order.id} 
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => {
                    setSelectedOrder(order);
                    setIsConfirmingReturn(false);
                }}
              >
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

      {/* Quick PO Modal */}
      {showQuickPO && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg">Quick Purchase Order</h3>
                      <button onClick={() => setShowQuickPO(false)}><X size={20} /></button>
                  </div>
                  
                  <div className="space-y-4">
                      {!poSelectedProduct ? (
                          <div className="space-y-2">
                              <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                  <input
                                      type="text"
                                      className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 text-sm"
                                      placeholder="Search product..."
                                      value={poSearch}
                                      onChange={e => setPoSearch(e.target.value)}
                                      autoFocus
                                  />
                              </div>
                              {poSearch && (
                                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-60 overflow-y-auto">
                                      {filteredPoProducts.map(p => {
                                          const stock = batches.filter(b => b.productId === p.id).reduce((s, b) => s + b.stock, 0);
                                          return (
                                              <div 
                                                  key={p.id} 
                                                  className="p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                                                  onClick={() => setPoSelectedProduct(p)}
                                              >
                                                  <div>
                                                      <p className="font-medium text-gray-900">{p.name}</p>
                                                      <p className="text-xs text-gray-500">{p.code}</p>
                                                  </div>
                                                  <div className="text-right">
                                                      <p className="text-xs text-gray-500">Stock</p>
                                                      <p className={`font-bold ${stock <= p.minStockAlert ? 'text-red-600' : 'text-gray-900'}`}>{stock}</p>
                                                  </div>
                                              </div>
                                          );
                                      })}
                                      {filteredPoProducts.length === 0 && (
                                          <div className="p-4 text-center text-gray-500 text-sm">No products found</div>
                                      )}
                                  </div>
                              )}
                          </div>
                      ) : (
                          <div className="space-y-4">
                              <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                                  <div>
                                      <p className="font-bold text-gray-900">{poSelectedProduct.name}</p>
                                      <p className="text-xs text-gray-500">{poSelectedProduct.code}</p>
                                  </div>
                                  <Button size="sm" variant="ghost" onClick={() => setPoSelectedProduct(null)} className="text-blue-600">Change</Button>
                              </div>
                              
                              <div className="flex gap-4">
                                  <div className="flex-1">
                                      <label className="text-xs text-gray-500 block mb-1">Current Stock</label>
                                      <div className="font-bold text-lg">
                                          {batches.filter(b => b.productId === poSelectedProduct.id).reduce((s, b) => s + b.stock, 0)}
                                      </div>
                                  </div>
                                  <div className="flex-1">
                                      <label className="text-xs text-gray-500 block mb-1">Min Alert</label>
                                      <div className="font-medium text-gray-700">
                                          {poSelectedProduct.minStockAlert}
                                      </div>
                                  </div>
                              </div>

                              <Input 
                                  label="Purchase Quantity" 
                                  type="number" 
                                  value={poQuantity} 
                                  onChange={e => setPoQuantity(e.target.value)}
                                  autoFocus
                              />

                              <Button className="w-full" onClick={handleQuickPOCreate}>
                                  Create Purchase Order
                              </Button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
      {/* Order Details Modal */}
      {selectedOrder && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-2xl p-6 max-h-[80vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="font-bold text-lg">Order #{selectedOrder.id.slice(-6).toUpperCase()}</h3>
                        <p className="text-xs text-gray-500">{new Date(selectedOrder.date).toLocaleString()}</p>
                      </div>
                      <button onClick={() => {
                          setSelectedOrder(null);
                          setIsConfirmingReturn(false);
                      }}><X size={20} /></button>
                  </div>

                  <div className="space-y-4 mb-6">
                      <div className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                          <span className="text-sm text-gray-600">Status</span>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                              selectedOrder.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                              {selectedOrder.status}
                          </span>
                      </div>
                      
                      {selectedOrder.customerName && (
                          <div className="bg-blue-50 p-3 rounded-lg">
                              <p className="text-xs text-blue-600 font-semibold uppercase mb-1">Customer</p>
                              <p className="font-medium text-gray-900">{selectedOrder.customerName}</p>
                          </div>
                      )}

                      <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Items</p>
                          <div className="border border-gray-100 rounded-lg divide-y divide-gray-100">
                              {selectedOrder.items.map((item, idx) => (
                                  <div key={idx} className="p-3 flex justify-between items-center">
                                      <div>
                                          <p className="font-medium text-sm text-gray-900">{item.name}</p>
                                          <p className="text-xs text-gray-500">{item.quantity} x {formatCurrency(item.finalPrice)}</p>
                                      </div>
                                      <p className="font-medium text-sm text-gray-900">{formatCurrency(item.quantity * item.finalPrice)}</p>
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                          <span className="font-bold text-gray-900">Total Amount</span>
                          <span className="font-bold text-xl text-blue-600">{formatCurrency(selectedOrder.total)}</span>
                      </div>
                  </div>

                  <div className="flex gap-3">
                      {isConfirmingReturn ? (
                          <>
                              <Button variant="outline" className="flex-1" onClick={() => setIsConfirmingReturn(false)}>
                                  Cancel
                              </Button>
                              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleReturnOrder}>
                                  Confirm Return
                              </Button>
                          </>
                      ) : (
                          <>
                              <Button variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => setIsConfirmingReturn(true)}>
                                  <RotateCcw size={16} className="mr-2" /> Return Order
                              </Button>
                              <Button className="flex-1" onClick={() => {
                                  setSelectedOrder(null);
                                  setIsConfirmingReturn(false);
                              }}>
                                  Close
                              </Button>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
