import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Card, Button, Badge, Input } from '../components/ui';
import { formatCurrency } from '../utils';
import { Globe, Wifi, WifiOff, ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { Batch } from '../types';

export default function OnlineStore() {
  const { batches, products, updateBatchOnlineStatus } = useStore();
  const [activeTab, setActiveTab] = useState<'draft' | 'live'>('draft');

  // Filter batches suitable for online (must have stock and not expired)
  const today = new Date();
  const validBatches = batches.filter(b => {
    return b.stock > 0 && new Date(b.expiryDate) > today;
  });

  const draftBatches = validBatches.filter(b => !b.onlineStatus || b.onlineStatus === 'OFFLINE' || b.onlineStatus === 'DRAFT');
  const liveBatches = validBatches.filter(b => b.onlineStatus === 'LIVE');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Online Store Manager</h2>
        <div className="flex items-center gap-2 text-sm">
            <span className="flex items-center gap-1 text-green-600 font-medium">
                <Globe size={16} /> {liveBatches.length} Live
            </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-gray-100 rounded-lg">
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'draft' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
          onClick={() => setActiveTab('draft')}
        >
          Drafts & Offline ({draftBatches.length})
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'live' ? 'bg-white shadow-sm text-green-700' : 'text-gray-500'}`}
          onClick={() => setActiveTab('live')}
        >
          Live Online ({liveBatches.length})
        </button>
      </div>

      <div className="space-y-3">
        {activeTab === 'draft' ? (
            draftBatches.length === 0 ? (
                <EmptyState message="No offline stock available to list." />
            ) : (
                draftBatches.map(batch => (
                    <OnlineBatchCard 
                        key={batch.id} 
                        batch={batch} 
                        productName={products.find(p => p.id === batch.productId)?.name || 'Unknown'}
                        onUpdate={updateBatchOnlineStatus}
                        mode="draft"
                    />
                ))
            )
        ) : (
            liveBatches.length === 0 ? (
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
            )
        )}
      </div>
    </div>
  );
}

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
