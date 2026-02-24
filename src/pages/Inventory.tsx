import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Button, Input, Card, Badge } from '../components/ui';
import { formatCurrency } from '../utils';
import { Search, Plus, X, ChevronRight, AlertTriangle, Calendar, Package, FileText } from 'lucide-react';
import { Product, Batch } from '../types';

export default function Inventory() {
  const navigate = useNavigate();
  const { products, batches, addProduct, addBatch } = useStore();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'batches'>('list');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Modals
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddBatch, setShowAddBatch] = useState(false);

  // Combined Form State
  const [combinedForm, setCombinedForm] = useState({
    // Product Fields
    code: '',
    name: '',
    category: '',
    unit: 'pcs',
    gstRate: '0',
    minStockAlert: '10',
    
    // Batch Fields
    batchNumber: '',
    manufacturingDate: '',
    expiryDate: '',
    stock: '',
    purchaseRate: '',
    mrp: ''
  });

  // Batch Form State (for adding batch to existing product)
  const [batchForm, setBatchForm] = useState({
    batchNumber: '',
    manufacturingDate: '',
    expiryDate: '',
    purchaseRate: '',
    mrp: '',
    stock: ''
  });

  // Derived State
  const productStockMap = products.map(p => {
    const productBatches = batches.filter(b => b.productId === p.id);
    const totalStock = productBatches.reduce((sum, b) => sum + b.stock, 0);
    const nearestExpiry = productBatches
      .filter(b => b.stock > 0)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())[0]?.expiryDate;
    
    return { ...p, totalStock, batchCount: productBatches.length, nearestExpiry };
  });

  const filteredProducts = productStockMap.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateProductWithBatch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Create Product
    const newProduct = addProduct({
      code: combinedForm.code,
      name: combinedForm.name,
      category: combinedForm.category,
      unit: combinedForm.unit,
      gstRate: Number(combinedForm.gstRate),
      minStockAlert: Number(combinedForm.minStockAlert)
    });

    // 2. Create Initial Batch
    if (combinedForm.batchNumber) {
      addBatch({
        productId: newProduct.id,
        batchNumber: combinedForm.batchNumber,
        manufacturingDate: combinedForm.manufacturingDate,
        expiryDate: combinedForm.expiryDate,
        purchaseRate: Number(combinedForm.purchaseRate),
        mrp: Number(combinedForm.mrp),
        stock: Number(combinedForm.stock)
      });
    }

    setShowAddProduct(false);
    // Reset form
    setCombinedForm({
      code: '', name: '', category: '', unit: 'pcs', gstRate: '0', minStockAlert: '10',
      batchNumber: '', manufacturingDate: '', expiryDate: '', stock: '', purchaseRate: '', mrp: ''
    });
  };

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    addBatch({
      productId: selectedProduct.id,
      batchNumber: batchForm.batchNumber,
      manufacturingDate: batchForm.manufacturingDate,
      expiryDate: batchForm.expiryDate,
      purchaseRate: Number(batchForm.purchaseRate),
      mrp: Number(batchForm.mrp),
      stock: Number(batchForm.stock)
    });
    setShowAddBatch(false);
    setBatchForm({ batchNumber: '', manufacturingDate: '', expiryDate: '', purchaseRate: '', mrp: '', stock: '' });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">
          {viewMode === 'list' ? 'Inventory' : selectedProduct?.name}
        </h2>
        {viewMode === 'list' ? (
          <div className="flex gap-2">
            <Button onClick={() => navigate('/invoice-upload')} size="sm" variant="outline">
               <FileText size={16} className="mr-1" /> Import Invoice
            </Button>
            <Button onClick={() => setShowAddProduct(true)} size="sm">
                <Plus size={16} className="mr-1" /> New Product
            </Button>
          </div>
        ) : (
          <Button onClick={() => setShowAddBatch(true)} size="sm">
            <Plus size={16} className="mr-1" /> New Batch
          </Button>
        )}
      </div>

      {/* Back Button for Batch View */}
      {viewMode === 'batches' && (
        <button 
          onClick={() => { setViewMode('list'); setSelectedProduct(null); }}
          className="text-sm text-blue-600 flex items-center mb-2"
        >
          ← Back to Product List
        </button>
      )}

      {/* Search (only in list mode) */}
      {viewMode === 'list' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Search by name or code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Product List */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {filteredProducts.map(item => (
            <Card key={item.id} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{item.name}</h3>
                  <div className="flex gap-2 text-sm text-gray-500 mt-1">
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">{item.code}</span>
                    <span>{item.category}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{item.totalStock}</p>
                  <p className="text-xs text-gray-500">{item.unit}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-50 p-3 rounded-lg text-sm">
                 <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Batches</p>
                    <p className="font-medium text-gray-900">{item.batchCount}</p>
                 </div>
                 <div>
                    <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Nearest Exp.</p>
                    <p className={`font-medium ${item.nearestExpiry && new Date(item.nearestExpiry) < new Date() ? 'text-red-600' : 'text-gray-900'}`}>
                        {item.nearestExpiry ? new Date(item.nearestExpiry).toLocaleDateString() : 'N/A'}
                    </p>
                 </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full border-blue-200 text-blue-700 hover:bg-blue-50" 
                onClick={() => { setSelectedProduct(item); setViewMode('batches'); }}
              >
                View Batches <ChevronRight size={16} className="ml-1" />
              </Button>
            </Card>
          ))}
          {filteredProducts.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              <Package className="mx-auto mb-2 opacity-20" size={48} />
              <p>No products found.</p>
            </div>
          )}
        </div>
      )}

      {/* Batch List (Table) */}
      {viewMode === 'batches' && selectedProduct && (
        <Card className="overflow-hidden border-0 shadow-md">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                        <tr>
                            <th className="p-4 whitespace-nowrap font-semibold">Batch #</th>
                            <th className="p-4 whitespace-nowrap font-semibold">Expiry</th>
                            <th className="p-4 whitespace-nowrap font-semibold">MRP</th>
                            <th className="p-4 whitespace-nowrap font-semibold">Stock</th>
                            <th className="p-4 whitespace-nowrap font-semibold">Online</th>
                            <th className="p-4 whitespace-nowrap font-semibold">Purchase</th>
                            <th className="p-4 whitespace-nowrap font-semibold">Mfg Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {batches
                            .filter(b => b.productId === selectedProduct.id)
                            .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
                            .map(batch => (
                                <tr key={batch.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-mono font-medium text-gray-900">{batch.batchNumber}</td>
                                    <td className="p-4">
                                        <Badge variant={new Date(batch.expiryDate) < new Date() ? 'danger' : 'default'}>
                                            {new Date(batch.expiryDate).toLocaleDateString()}
                                        </Badge>
                                    </td>
                                    <td className="p-4 text-gray-900">{formatCurrency(batch.mrp)}</td>
                                    <td className="p-4 font-bold text-gray-900">{batch.stock}</td>
                                    <td className="p-4">
                                        <Badge variant={batch.onlineStatus === 'LIVE' ? 'success' : batch.onlineStatus === 'DRAFT' ? 'warning' : 'default'}>
                                            {batch.onlineStatus || 'OFFLINE'}
                                        </Badge>
                                    </td>
                                    <td className="p-4 text-gray-500">{formatCurrency(batch.purchaseRate)}</td>
                                    <td className="p-4 text-gray-500">{batch.manufacturingDate ? new Date(batch.manufacturingDate).toLocaleDateString() : '-'}</td>
                                </tr>
                            ))}
                        {batches.filter(b => b.productId === selectedProduct.id).length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-500">
                                    No batches found. Add a new batch to start selling.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
      )}

      {/* Add Product Modal (Combined) */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-gray-900">Add New Product</h3>
              <button onClick={() => setShowAddProduct(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateProductWithBatch} className="space-y-4">
              {/* Product Details Section */}
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Product Code *" 
                  placeholder="Enter product code"
                  value={combinedForm.code} 
                  onChange={e => setCombinedForm({...combinedForm, code: e.target.value})} 
                  required 
                />
                <Input 
                  label="Product Name *" 
                  placeholder="Enter product name"
                  value={combinedForm.name} 
                  onChange={e => setCombinedForm({...combinedForm, name: e.target.value})} 
                  required 
                />
              </div>

              <Input 
                label="Batch Number *" 
                placeholder="Enter batch number"
                value={combinedForm.batchNumber} 
                onChange={e => setCombinedForm({...combinedForm, batchNumber: e.target.value})} 
                required 
              />

              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Manufacturing Date" 
                  type="date" 
                  value={combinedForm.manufacturingDate} 
                  onChange={e => setCombinedForm({...combinedForm, manufacturingDate: e.target.value})} 
                />
                <Input 
                  label="Expiry Date" 
                  type="date" 
                  value={combinedForm.expiryDate} 
                  onChange={e => setCombinedForm({...combinedForm, expiryDate: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Stock Quantity *" 
                  type="number" 
                  placeholder="0"
                  value={combinedForm.stock} 
                  onChange={e => setCombinedForm({...combinedForm, stock: e.target.value})} 
                  required 
                />
                <Input 
                  label="Unit" 
                  placeholder="pcs"
                  value={combinedForm.unit} 
                  onChange={e => setCombinedForm({...combinedForm, unit: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Purchase Rate *" 
                  type="number" 
                  placeholder="0"
                  value={combinedForm.purchaseRate} 
                  onChange={e => setCombinedForm({...combinedForm, purchaseRate: e.target.value})} 
                  required 
                />
                <Input 
                  label="MRP *" 
                  type="number" 
                  placeholder="0"
                  value={combinedForm.mrp} 
                  onChange={e => setCombinedForm({...combinedForm, mrp: e.target.value})} 
                  required 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GST % *</label>
                <select 
                  className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={combinedForm.gstRate}
                  onChange={e => setCombinedForm({...combinedForm, gstRate: e.target.value})}
                >
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12 text-base">
                  Add Product
                </Button>
                <Button type="button" variant="outline" className="flex-1 h-12 text-base" onClick={() => setShowAddProduct(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Batch Modal */}
      {showAddBatch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 animate-in slide-in-from-bottom-10 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Add Batch for {selectedProduct?.name}</h3>
              <button onClick={() => setShowAddBatch(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateBatch} className="space-y-3">
              <Input label="Batch Number" value={batchForm.batchNumber} onChange={e => setBatchForm({...batchForm, batchNumber: e.target.value})} required />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Mfg Date" type="date" value={batchForm.manufacturingDate} onChange={e => setBatchForm({...batchForm, manufacturingDate: e.target.value})} />
                <Input label="Exp Date" type="date" value={batchForm.expiryDate} onChange={e => setBatchForm({...batchForm, expiryDate: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Purchase Rate" type="number" value={batchForm.purchaseRate} onChange={e => setBatchForm({...batchForm, purchaseRate: e.target.value})} required />
                <Input label="MRP" type="number" value={batchForm.mrp} onChange={e => setBatchForm({...batchForm, mrp: e.target.value})} required />
              </div>
              <Input label="Stock Quantity" type="number" value={batchForm.stock} onChange={e => setBatchForm({...batchForm, stock: e.target.value})} required />
              <Button type="submit" className="w-full mt-4">Add Batch Stock</Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ClockIcon({ size }: { size: number }) {
  return <Calendar size={size} />;
}
