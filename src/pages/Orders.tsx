import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Card, Badge, Button } from '../components/ui';
import { formatCurrency } from '../utils';
import { Package, Truck, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Order } from '../types';

export default function Orders() {
  const { orders, updateOrderStatus } = useStore();
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Active' | 'Completed'>('All');

  const filteredOrders = orders.filter(order => {
    if (filter === 'All') return true;
    if (filter === 'Pending') return order.status === 'Pending';
    if (filter === 'Active') return ['Accepted', 'Packed', 'Out for Delivery'].includes(order.status);
    if (filter === 'Completed') return ['Delivered', 'Completed', 'Cancelled'].includes(order.status);
    return true;
  });

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'Pending': return 'warning';
      case 'Accepted': return 'default';
      case 'Packed': return 'default';
      case 'Out for Delivery': return 'default';
      case 'Delivered': return 'success';
      case 'Completed': return 'success';
      case 'Cancelled': return 'danger';
      default: return 'default';
    }
  };

  const nextStatus = (current: Order['status']): Order['status'] | null => {
    if (current === 'Pending') return 'Accepted';
    if (current === 'Accepted') return 'Packed';
    if (current === 'Packed') return 'Out for Delivery';
    if (current === 'Out for Delivery') return 'Delivered';
    return null;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Orders</h2>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['All', 'Pending', 'Active', 'Completed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <Package className="mx-auto mb-2 opacity-20" size={48} />
            <p>No orders found</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <Card key={order.id} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900">#{order.id.slice(-4)}</span>
                    <Badge variant={getStatusColor(order.status)}>{order.status}</Badge>
                    <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded">
                      {order.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{order.customerName || 'Walk-in Customer'}</p>
                  <p className="text-xs text-gray-400">{new Date(order.date).toLocaleString()}</p>
                </div>
                <p className="font-bold text-lg text-gray-900">{formatCurrency(order.total)}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 mb-3 text-sm text-gray-600 space-y-1">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{item.quantity}x {item.name} <span className="text-xs text-gray-400">({item.batchNumber})</span></span>
                    <span>{formatCurrency(item.mrp * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              {order.status !== 'Completed' && order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                <div className="flex gap-2 mt-2">
                  {order.status === 'Pending' && (
                    <Button 
                      variant="danger" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => updateOrderStatus(order.id, 'Cancelled')}
                    >
                      Reject
                    </Button>
                  )}
                  {nextStatus(order.status) && (
                    <Button 
                      className="flex-1" 
                      size="sm"
                      onClick={() => updateOrderStatus(order.id, nextStatus(order.status)!)}
                    >
                      {order.status === 'Pending' ? 'Accept Order' : `Mark as ${nextStatus(order.status)}`}
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
