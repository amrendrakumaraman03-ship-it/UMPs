import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Card, Button, Badge, Input } from '../components/ui';
import { formatCurrency } from '../utils';
import { Globe, Wifi, WifiOff, ArrowRight, AlertTriangle, CheckCircle, Share2, Plus, TrendingUp, Users, ShoppingBag, DollarSign } from 'lucide-react';
import { Batch } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function OnlineStore() {
  const { batches, products, updateBatchOnlineStatus, orders, updateOrderStatus, store } = useStore();
  const [activeTab, setActiveTab] = useState<'draft' | 'live' | 'orders'>('orders');
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);

  useEffect(() => {
      setSelectedBatches([]);
  }, [activeTab]);

  // Filter batches suitable for online (must have stock and not expired)
  const today = new Date();
  const validBatches = batches.filter(b => {
    return b.stock > 0 && new Date(b.expiryDate) > today;
  });

  const draftBatches = validBatches.filter(b => !b.onlineStatus || b.onlineStatus === 'OFFLINE' || b.onlineStatus === 'DRAFT');
  const liveBatches = validBatches.filter(b => b.onlineStatus === 'LIVE');
  const onlineOrders = orders.filter(o => o.type === 'Online');

  // Bulk Actions
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
          setSelectedBatches(draftBatches.map(b => b.id));
      } else {
          setSelectedBatches([]);
      }
  };

  const handleToggleSelect = (batchId: string) => {
      setSelectedBatches(prev => 
          prev.includes(batchId) ? prev.filter(id => id !== batchId) : [...prev, batchId]
      );
  };

  const handleBulkGoLive = () => {
      if (window.confirm(`Are you sure you want to make ${selectedBatches.length} products live? This will set their online stock to match physical stock.`)) {
          selectedBatches.forEach(batchId => {
              const batch = batches.find(b => b.id === batchId);
              if (batch) {
                  updateBatchOnlineStatus(batch.id, 'LIVE', batch.stock);
              }
          });
          setSelectedBatches([]);
      }
  };

  // Analytics Data (Derived from real orders + mocked visits)
  const totalRevenue = onlineOrders.reduce((sum, o) => sum + o.total, 0);
  const conversionRate = onlineOrders.length > 0 ? ((onlineOrders.length / (onlineOrders.length * 15)) * 100).toFixed(1) : '0'; // Mock visits as 15x orders
  
  // Chart Data: Last 7 days of online orders
  const chartData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const dayOrders = onlineOrders.filter(o => o.date.startsWith(dateStr));
      return {
          name: d.toLocaleDateString('en-US', { weekday: 'short' }),
          orders: dayOrders.length,
          revenue: dayOrders.reduce((sum, o) => sum + o.total, 0)
      };
  });

  let content;
  if (activeTab === 'orders') {
      content = onlineOrders.length === 0 ? (
          <EmptyState message="No online orders yet." />
      ) : (
          <div className="space-y-3">
              {onlineOrders
                  .sort((a, b) => {
                      if (a.status === 'Urgent' && b.status !== 'Urgent') return -1;
                      if (a.status !== 'Urgent' && b.status === 'Urgent') return 1;
                      return new Date(b.date).getTime() - new Date(a.date).getTime();
                  })
                  .map(order => (
                  <OrderCard 
                      key={order.id} 
                      order={order} 
                      onUpdateStatus={updateOrderStatus} 
                  />
              ))}
          </div>
      );
  } else if (activeTab === 'draft') {
      content = draftBatches.length === 0 ? (
          <EmptyState message="No offline stock available to list." />
      ) : (
          <div className="space-y-3">
              <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                      <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={selectedBatches.length === draftBatches.length && draftBatches.length > 0}
                          onChange={handleSelectAll}
                      />
                      <span className="text-sm font-medium text-gray-700">Select All ({draftBatches.length})</span>
                  </div>
                  {selectedBatches.length > 0 && (
                      <Button size="sm" className="bg-green-600 text-white hover:bg-green-700 shadow-sm" onClick={handleBulkGoLive}>
                          Publish Selected ({selectedBatches.length}) <Globe size={16} className="ml-1" />
                      </Button>
                  )}
              </div>
              {draftBatches.map(batch => (
                  <div key={batch.id} className="flex gap-3 items-start group">
                      <div className="pt-6 pl-2">
                          <input 
                              type="checkbox" 
                              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              checked={selectedBatches.includes(batch.id)}
                              onChange={() => handleToggleSelect(batch.id)}
                          />
                      </div>
                      <div className="flex-1 transition-opacity group-hover:opacity-100">
                          <OnlineBatchCard 
                              batch={batch} 
                              productName={products.find(p => p.id === batch.productId)?.name || 'Unknown'}
                              onUpdate={updateBatchOnlineStatus}
                              mode="draft"
                          />
                      </div>
                  </div>
              ))}
          </div>
      );
  } else {
      content = liveBatches.length === 0 ? (
          <EmptyState message="No products are currently live." />
      ) : (
          liveBatches.map(batch => (
              <OnlineBatchCard 
                  key={batch.id} 
                  batch={batch} 
                  productName={products.find(p => p.id === batch.productId)?.name || 'Unknown'}
                  onUpdate={updateBatchOnlineStatus}
                  mode="live"
              />
          ))
      );
  }

  return (
    <div className="space-y-6">
      {/* Store Header Card */}
      <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                  <div>
                      <h2 className="text-2xl font-bold mb-1">Online Store Manager</h2>
                      <p className="text-blue-100 text-sm mb-4">Manage your digital storefront, track orders, and analyze performance.</p>
                      
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 inline-block mb-4 border border-white/20">
                          <p className="text-xs text-blue-200 uppercase tracking-wider mb-1">Store URL</p>
                          <div className="flex items-center gap-2">
                              <Globe size={16} className="text-blue-200" />
                              <span className="font-mono text-sm font-medium">
                                  {store?.name ? `https://${store.name.toLowerCase().replace(/\s+/g, '-')}.cloudpos.com` : 'https://your-store.cloudpos.com'}
                              </span>
                          </div>
                      </div>
                  </div>
                  <div className="bg-white/20 p-3 rounded-full">
                      <Globe size={32} className="text-white" />
                  </div>
              </div>

              <div className="flex gap-3">
                  <Button className="bg-white text-blue-600 hover:bg-blue-50 border-0">
                      <Share2 size={18} className="mr-2" /> Share Link
                  </Button>
                  <Button className="bg-blue-700 text-white hover:bg-blue-800 border-0" onClick={() => setActiveTab('draft')}>
                      <Plus size={18} className="mr-2" /> Add Product
                  </Button>
              </div>
          </div>
          
          {/* Decorative Background Element */}
          <div className="absolute -right-10 -bottom-20 opacity-10">
              <Globe size={300} />
          </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                  <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Revenue</p>
                      <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalRevenue)}</h3>
                  </div>
                  <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                      <DollarSign size={20} />
                  </div>
              </div>
              <div className="flex items-center text-xs text-green-600 font-medium">
                  <TrendingUp size={14} className="mr-1" /> +12% from last week
              </div>
          </Card>

          <Card className="p-4 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                  <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Store Visits</p>
                      <h3 className="text-2xl font-bold text-gray-900 mt-1">{onlineOrders.length * 15 + 42}</h3>
                  </div>
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                      <Users size={20} />
                  </div>
              </div>
              <div className="flex items-center text-xs text-blue-600 font-medium">
                  <TrendingUp size={14} className="mr-1" /> +5% new visitors
              </div>
          </Card>

          <Card className="p-4 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                  <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Orders</p>
                      <h3 className="text-2xl font-bold text-gray-900 mt-1">{onlineOrders.length}</h3>
                  </div>
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                      <ShoppingBag size={20} />
                  </div>
              </div>
              <div className="flex items-center text-xs text-gray-500">
                  Conversion Rate: <span className="font-bold text-gray-900 ml-1">{conversionRate}%</span>
              </div>
          </Card>
      </div>

      {/* Sales Trend Chart */}
      <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-900">Sales Performance</h3>
              <select className="text-sm border-gray-300 rounded-md text-gray-500 bg-gray-50 px-2 py-1">
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
              </select>
          </div>
          <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#6B7280', fontSize: 12 }} 
                          dy={10}
                      />
                      <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#6B7280', fontSize: 12 }} 
                          tickFormatter={(value) => `₹${value}`}
                      />
                      <Tooltip 
                          cursor={{ fill: '#F3F4F6' }}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      />
                      <Bar dataKey="revenue" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
              </ResponsiveContainer>
          </div>
      </Card>

      {/* Tabs & Content */}
      <div className="space-y-4">
          <div className="flex p-1 bg-gray-100 rounded-xl">
            <button
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'orders' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('orders')}
            >
              Orders <Badge variant="default" className="ml-2 bg-blue-100 text-blue-700">{onlineOrders.filter(o => o.status === 'Pending' || o.status === 'Urgent').length}</Badge>
            </button>
            <button
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'draft' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('draft')}
            >
              Drafts <Badge variant="default" className="ml-2">{draftBatches.length}</Badge>
            </button>
            <button
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'live' ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('live')}
            >
              Live <Badge variant="success" className="ml-2">{liveBatches.length}</Badge>
            </button>
          </div>

          <div className="min-h-[300px]">
            {content}
          </div>
      </div>
    </div>
  );
}

const OrderCard: React.FC<{ 
    order: any, 
    onUpdateStatus: (id: string, status: any) => void 
}> = ({ order, onUpdateStatus }) => {
    return (
        <Card className={`p-4 border-l-4 ${order.status === 'Urgent' ? 'border-l-red-500 bg-red-50' : order.status === 'Pending' ? 'border-l-blue-500' : 'border-l-gray-300'}`}>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">Order #{order.id.slice(-4)}</h3>
                        {order.status === 'Urgent' && <Badge variant="danger" className="animate-pulse">URGENT</Badge>}
                    </div>
                    <p className="text-xs text-gray-500">{new Date(order.date).toLocaleString()}</p>
                </div>
                <Badge variant={order.status === 'Completed' ? 'success' : order.status === 'Cancelled' ? 'danger' : 'default'}>
                    {order.status}
                </Badge>
            </div>

            <div className="space-y-1 mb-3">
                {order.items.map((item: any, idx: number) => (
                    <p key={idx} className="text-sm text-gray-700 flex justify-between">
                        <span>{item.name} x {item.quantity}</span>
                        <span className="text-gray-500 font-mono text-xs">Batch: {item.batchNumber}</span>
                    </p>
                ))}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <p className="font-bold text-gray-900">{formatCurrency(order.total)}</p>
                <div className="flex gap-2">
                    {order.status === 'Pending' && (
                        <>
                            <Button size="sm" variant="outline" className="text-red-600" onClick={() => onUpdateStatus(order.id, 'Cancelled')}>Reject</Button>
                            <Button size="sm" className="bg-blue-600 text-white" onClick={() => onUpdateStatus(order.id, 'Accepted')}>Accept</Button>
                            <Button size="sm" className="bg-red-600 text-white" onClick={() => onUpdateStatus(order.id, 'Urgent')}>Mark Urgent</Button>
                        </>
                    )}
                    {(order.status === 'Accepted' || order.status === 'Urgent') && (
                        <Button size="sm" className="bg-green-600 text-white w-full" onClick={() => onUpdateStatus(order.id, 'Completed')}>Mark Fulfilled</Button>
                    )}
                </div>
            </div>
        </Card>
    );
};

const OnlineBatchCard: React.FC<{ 
    batch: Batch, 
    productName: string, 
    onUpdate: (id: string, status: 'OFFLINE' | 'DRAFT' | 'LIVE', stock?: number) => void,
    mode: 'draft' | 'live'
}> = ({ batch, productName, onUpdate, mode }) => {
    const [onlineQty, setOnlineQty] = useState(batch.onlineStock || 0);

    const handleMoveToLive = () => {
        if (onlineQty <= 0) {
            alert("Please set a valid online quantity");
            return;
        }
        if (onlineQty > batch.stock) {
            alert(`Cannot exceed physical stock (${batch.stock})`);
            return;
        }
        onUpdate(batch.id, 'LIVE', onlineQty);
    };

    const handleMoveToDraft = () => {
        onUpdate(batch.id, 'DRAFT', 0); // Reset stock when moving back to draft/offline
    };

    return (
        <Card className="p-4">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="font-bold text-gray-900">{productName}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded">Batch: {batch.batchNumber}</span>
                        <span>Exp: {new Date(batch.expiryDate).toLocaleDateString()}</span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-500">Physical Stock</p>
                    <p className="font-bold text-lg">{batch.stock}</p>
                </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg flex items-center justify-between gap-4">
                <div className="flex-1">
                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                        {mode === 'draft' ? 'Qty to List Online' : 'Live Online Qty'}
                    </label>
                    <div className="flex items-center gap-2">
                        <Input 
                            type="number" 
                            className="h-9 bg-white"
                            value={onlineQty}
                            onChange={(e) => setOnlineQty(Number(e.target.value))}
                            max={batch.stock}
                        />
                        <span className="text-xs text-gray-500">/ {batch.stock}</span>
                    </div>
                </div>
                <div className="flex items-end">
                    {mode === 'draft' ? (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleMoveToLive}>
                            Go Live <Globe size={16} className="ml-1" />
                        </Button>
                    ) : (
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleMoveToDraft}>
                            Take Offline <WifiOff size={16} className="ml-1" />
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
};

function EmptyState({ message }: { message: string }) {
    return (
        <div className="text-center py-12 text-gray-500">
            <Globe className="mx-auto mb-3 opacity-20" size={48} />
            <p>{message}</p>
        </div>
    );
}
