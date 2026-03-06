import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Card, Button, Badge, Input } from '../components/ui';
import { formatCurrency } from '../utils';
import { AlertTriangle, ArrowLeft, Save, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Batch } from '../types';

export default function ExpiryDiscount() {
  const { batches, products, updateBatchDiscount } = useStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'All' | 'Critical' | 'Near'>('All');

  const today = new Date();
  const criticalThreshold = new Date(today);
  criticalThreshold.setDate(today.getDate() + 30); // 30 days
  const nearThreshold = new Date(today);
  nearThreshold.setDate(today.getDate() + 90); // 90 days

  const getExpiryStatus = (expiryDate: string) => {
    const exp = new Date(expiryDate);
    if (exp < today) return 'Expired';
    if (exp <= criticalThreshold) return 'Critical';
    if (exp <= nearThreshold) return 'Near';
    return 'Good';
  };

  const expiryBatches = batches.filter(b => {
    const status = getExpiryStatus(b.expiryDate);
    if (status === 'Expired' || status === 'Good') return false; // Only show Critical and Near
    if (filter === 'Critical') return status === 'Critical';
    if (filter === 'Near') return status === 'Near';
    return true;
  }).sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold text-gray-900">Clearance Management</h2>
      </div>

      <div className="flex gap-2" role="tablist" aria-label="Expiry Filters">
        {['All', 'Critical', 'Near'].map((f, index, array) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            aria-controls={`tabpanel-${f}`}
            id={`tab-${f}`}
            tabIndex={filter === f ? 0 : -1}
            onClick={() => setFilter(f as any)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                const nextTab = array[(index + 1) % array.length];
                document.getElementById(`tab-${nextTab}`)?.focus();
                setFilter(nextTab as any);
              }
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                const prevTab = array[(index - 1 + array.length) % array.length];
                document.getElementById(`tab-${prevTab}`)?.focus();
                setFilter(prevTab as any);
              }
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            {f} Expiry
          </button>
        ))}
      </div>

      <div 
        className="space-y-3 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
        role="tabpanel"
        id={`tabpanel-${filter}`}
        aria-labelledby={`tab-${filter}`}
        tabIndex={0}
      >
        {expiryBatches.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <Tag className="mx-auto mb-2 opacity-20" size={48} />
            <p>No near-expiry stock found.</p>
          </div>
        ) : (
          expiryBatches.map(batch => {
            const product = products.find(p => p.id === batch.productId);
            const status = getExpiryStatus(batch.expiryDate);
            const daysLeft = Math.ceil((new Date(batch.expiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            return (
              <DiscountCard 
                key={batch.id} 
                batch={batch} 
                productName={product?.name || 'Unknown'} 
                status={status}
                daysLeft={daysLeft}
                onUpdate={(discount) => updateBatchDiscount(batch.id, discount)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

const DiscountCard: React.FC<{ 
  batch: Batch, 
  productName: string, 
  status: string,
  daysLeft: number,
  onUpdate: (d: NonNullable<Batch['discount']>) => void 
}> = ({ batch, productName, status, daysLeft, onUpdate }) => {
  const [discountValue, setDiscountValue] = useState(batch.discount?.value?.toString() || '');
  const [isEnabled, setIsEnabled] = useState(batch.discount?.enabled || false);

  const handleSave = () => {
    const val = Number(discountValue);
    if (val > 40) {
      alert("Discount cannot exceed 40%");
      return;
    }
    onUpdate({
      type: 'PERCENTAGE',
      value: val,
      enabled: isEnabled
    });
  };

  return (
    <Card className="p-4 border-l-4 border-l-orange-500">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-bold text-gray-900">{productName}</h3>
          <p className="text-xs text-gray-500 font-mono">Batch: {batch.batchNumber}</p>
        </div>
        <Badge variant={status === 'Critical' ? 'danger' : 'warning'}>
          {daysLeft} days left
        </Badge>
      </div>

      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg mb-3">
        <div className="text-sm">
          <p className="text-gray-500">Stock</p>
          <p className="font-bold">{batch.stock}</p>
        </div>
        <div className="text-sm text-right">
          <p className="text-gray-500">MRP</p>
          <p className="font-bold">{formatCurrency(batch.mrp)}</p>
        </div>
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="text-xs font-medium text-gray-700 mb-1 block">Discount % (Max 40)</label>
          <div className="flex items-center gap-2">
            <Input 
              type="number" 
              placeholder="0" 
              value={discountValue} 
              onChange={e => setDiscountValue(e.target.value)}
              className="h-9"
            />
            <span className="text-sm font-bold text-gray-500">%</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mb-1">
            <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={isEnabled}
              onChange={e => setIsEnabled(e.target.checked)}
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
          <span className="text-xs text-gray-600">Active</span>
        </div>

        <Button size="sm" onClick={handleSave} disabled={!discountValue}>
          <Save size={16} className="mr-1" /> Apply
        </Button>
      </div>
    </Card>
  );
};
