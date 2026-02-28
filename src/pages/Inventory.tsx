import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Button, Input, Card, Badge } from '../components/ui';
import { formatCurrency } from '../utils';
import { Search, Plus, X, ChevronRight, AlertTriangle, Calendar, Package, FileText, History, ArrowDown, ArrowUp, ShoppingCart, Filter, Download, Send, CheckCircle } from 'lucide-react';
import { Product, Batch, StockLedgerEntry, PurchaseOrder } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Inventory() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { products, batches, addProduct, addBatch, stockLedger, purchaseOrders, addPurchaseOrder, updatePurchaseOrderStatus, updatePurchaseOrder, suppliers, addSupplier, store } = useStore();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'inventory' | 'ledger' | 'po'>('inventory');
  const [viewMode, setViewMode] = useState<'list' | 'batches'>('list');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  
  // Modals
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [showLedger, setShowLedger] = useState<string | null>(null); // batchId
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showCreatePO, setShowCreatePO] = useState<string | null>(null); // supplierId
  const [selectedSupplierHistory, setSelectedSupplierHistory] = useState<string | null>(null); // supplierId for history filter

  // Add Item to PO State
  const [showAddItemPO, setShowAddItemPO] = useState<string | null>(null); // poId
  const [addItemSearch, setAddItemSearch] = useState('');
  const [addItemSelectedProduct, setAddItemSelectedProduct] = useState<Product | null>(null);
  const [addItemQuantity, setAddItemQuantity] = useState('');
  const [addItemRate, setAddItemRate] = useState('');

  // Initialize from URL params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'inventory' || tab === 'ledger' || tab === 'po') {
      setActiveTab(tab);
    }
    
    if (searchParams.get('filter') === 'low_stock') {
      setShowLowStockOnly(true);
      setActiveTab('inventory');
    }
    
    if (searchParams.get('new') === 'true') {
        setShowAddProduct(true);
    }
  }, [searchParams]);

  // Combined Form State
  const [combinedForm, setCombinedForm] = useState({
    code: '', name: '', category: '', unit: 'pcs', gstRate: '0', minStockAlert: '10',
    batchNumber: '', manufacturingDate: '', expiryDate: '', stock: '', purchaseRate: '', mrp: ''
  });

  // Batch Form State
  const [batchForm, setBatchForm] = useState({
    batchNumber: '', manufacturingDate: '', expiryDate: '', purchaseRate: '', mrp: '', stock: ''
  });

  // Supplier Form State
  const [supplierForm, setSupplierForm] = useState({
    name: '', details: '', contact: ''
  });

  // Create PO State
  const [poItems, setPoItems] = useState<{productId: string, productName: string, quantity: number, rate: number}[]>([]);
  const [poSearch, setPoSearch] = useState('');
  const [poSelectedProduct, setPoSelectedProduct] = useState<Product | null>(null);
  const [poQuantity, setPoQuantity] = useState('');
  const [poRate, setPoRate] = useState('');

  // Derived State
  const productStockMap = products.map(p => {
    const productBatches = batches.filter(b => b.productId === p.id);
    const totalStock = productBatches.reduce((sum, b) => sum + b.stock, 0);
    const nearestExpiry = productBatches
      .filter(b => b.stock > 0)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())[0]?.expiryDate;
    
    return { ...p, totalStock, batchCount: productBatches.length, nearestExpiry };
  });

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category))).filter(Boolean)];

  const filteredProducts = productStockMap.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    addSupplier({
        name: supplierForm.name,
        details: supplierForm.details,
        contact: supplierForm.contact
    });
    setShowAddSupplier(false);
    setSupplierForm({ name: '', details: '', contact: '' });
  };

  const handleAddItemToCreatePO = () => {
      if (!poSelectedProduct || !poQuantity) return;
      
      const newItem = {
          productId: poSelectedProduct.id,
          productName: poSelectedProduct.name,
          quantity: Number(poQuantity),
          rate: Number(poRate)
      };
      
      setPoItems([...poItems, newItem]);
      setPoSelectedProduct(null);
      setPoSearch('');
      setPoQuantity('');
      setPoRate('');
  };

  const handleSavePO = () => {
      if (!showCreatePO || poItems.length === 0) return;
      
      const supplier = suppliers.find(s => s.id === showCreatePO);
      
      addPurchaseOrder({
          supplierId: supplier?.id,
          supplierName: supplier?.name,
          supplierDetails: supplier?.details,
          items: poItems.map(i => ({
              productId: i.productId,
              productName: i.productName,
              quantity: i.quantity,
              expectedRate: i.rate
          })),
          status: 'Draft'
      });
      
      setShowCreatePO(null);
      setPoItems([]);
      setActiveTab('po');
      setSelectedSupplierHistory(supplier?.id || null); // Show history for this supplier after creating PO
  };

  const handleCreateProductWithBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const newProduct = addProduct({
      code: combinedForm.code,
      name: combinedForm.name,
      category: combinedForm.category,
      unit: combinedForm.unit,
      gstRate: Number(combinedForm.gstRate),
      minStockAlert: Number(combinedForm.minStockAlert)
    });

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

  const handleCreatePO = (item?: any) => {
      const items = item ? 
        [{ productId: item.id, productName: item.name, quantity: item.minStockAlert * 2 }] :
        products
            .filter(p => batches.filter(b => b.productId === p.id).reduce((s, b) => s + b.stock, 0) <= p.minStockAlert)
            .map(p => ({ productId: p.id, productName: p.name, quantity: p.minStockAlert * 2 }));

      if (items.length === 0) {
          alert("No low stock items to order.");
          return;
      }

      addPurchaseOrder({
          supplierName: 'General Supplier',
          items: items,
          status: 'Draft'
      });
      setActiveTab('po');
  };

  const handleAddItemToPO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddItemPO || !addItemSelectedProduct) return;

    const po = purchaseOrders.find(p => p.id === showAddItemPO);
    if (!po) return;

    const newItem = {
        productId: addItemSelectedProduct.id,
        productName: addItemSelectedProduct.name,
        quantity: Number(addItemQuantity),
        expectedRate: Number(addItemRate)
    };

    updatePurchaseOrder(po.id, { items: [...po.items, newItem] });
    
    // Reset
    setShowAddItemPO(null);
    setAddItemSearch('');
    setAddItemSelectedProduct(null);
    setAddItemQuantity('');
    setAddItemRate('');
  };

  const handleDownloadPO = (po: PurchaseOrder) => {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.text('Purchase Order', 14, 22);
      
      doc.setFontSize(10);
      doc.text(`PO #: ${po.id.slice(-6).toUpperCase()}`, 14, 30);
      doc.text(`Date: ${new Date(po.date).toLocaleDateString()}`, 14, 35);
      doc.text(`Status: ${po.status}`, 14, 40);

      // Supplier & Vendor Details
      doc.text('Supplier Details:', 14, 50);
      const fullSupplierText = `${po.supplierName || ''}\n${po.supplierDetails || ''}`;
      const supplierLines = doc.splitTextToSize(fullSupplierText, 80);
      doc.text(supplierLines, 14, 55);

      doc.text('Vendor / Bill To:', 110, 50);
      const storeDetails = store ? `${store.name}\n${store.address}\n${store.phone}` : 'Store Details';
      const vendorLines = doc.splitTextToSize(po.vendorDetails || storeDetails, 80);
      doc.text(vendorLines, 110, 55);

      // Items Table
      const tableColumn = ["#", "Code", "Item", "Rate", "Qty", "Total"];
      const tableRows = po.items.map((item, index) => {
          const product = products.find(p => p.id === item.productId);
          const rate = item.expectedRate || 0;
          const total = rate * item.quantity;
          return [
              index + 1,
              product?.code || 'N/A',
              item.productName,
              formatCurrency(rate),
              item.quantity,
              formatCurrency(total)
          ];
      });

      // Calculate Grand Total
      const grandTotal = po.items.reduce((sum, item) => sum + ((item.expectedRate || 0) * item.quantity), 0);
      tableRows.push(['', '', '', '', 'Grand Total', formatCurrency(grandTotal)]);

      autoTable(doc, {
          startY: 70,
          head: [tableColumn],
          body: tableRows,
      });

      doc.save(`PO_${po.id.slice(-6)}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">
          {activeTab === 'inventory' ? (viewMode === 'list' ? 'Inventory' : selectedProduct?.name) : activeTab === 'ledger' ? 'Stock Ledger' : 'Purchase Orders'}
        </h2>
        <div className="flex gap-2">
            {activeTab === 'inventory' && viewMode === 'list' && (
                <>
                    <Button onClick={() => navigate('/invoice-upload')} size="sm" variant="outline">
                        <FileText size={16} className="mr-1" /> Import
                    </Button>
                    <Button onClick={() => setShowAddProduct(true)} size="sm">
                        <Plus size={16} className="mr-1" /> New
                    </Button>
                </>
            )}
            {activeTab === 'inventory' && viewMode === 'batches' && (
                <Button onClick={() => setShowAddBatch(true)} size="sm">
                    <Plus size={16} className="mr-1" /> New Batch
                </Button>
            )}
            {activeTab === 'po' && (
                <Button onClick={() => handleCreatePO()} size="sm">
                    <Plus size={16} className="mr-1" /> Auto-Generate PO
                </Button>
            )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl">
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'inventory' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
        >
          Stock
        </button>
        <button 
          onClick={() => setActiveTab('ledger')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'ledger' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
        >
          Ledger
        </button>
        <button 
          onClick={() => setActiveTab('po')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'po' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
        >
          PO
        </button>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
          {activeTab === 'inventory' && (
              <div className="space-y-4">
                  {viewMode === 'batches' && selectedProduct && (
                      <button 
                        onClick={() => { setViewMode('list'); setSelectedProduct(null); }}
                        className="text-sm text-blue-600 flex items-center mb-2"
                      >
                        ← Back to Product List
                      </button>
                  )}

                  {viewMode === 'list' ? (
                      <div className="space-y-4">
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

                          {/* Category Filter */}
                          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                              {categories.map(category => (
                                  <button
                                      key={category}
                                      onClick={() => setSelectedCategory(category)}
                                      className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                                          selectedCategory === category 
                                              ? 'bg-blue-600 text-white shadow-sm' 
                                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                      }`}
                                  >
                                      {category}
                                  </button>
                              ))}
                          </div>

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
                                      <p className={`text-2xl font-bold ${item.totalStock <= item.minStockAlert ? 'text-red-600' : 'text-gray-900'}`}>
                                        {item.totalStock}
                                      </p>
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

                                  {item.totalStock <= item.minStockAlert && (
                                      <div className="bg-red-50 p-2 rounded-lg flex items-center justify-between mb-4 border border-red-100">
                                          <div className="flex items-center gap-2 text-red-700 text-xs font-medium">
                                              <AlertTriangle size={14} />
                                              <span>Low Stock Alert!</span>
                                          </div>
                                          <button 
                                            onClick={() => handleCreatePO(item)}
                                            className="text-[10px] bg-red-600 text-white px-2 py-1 rounded flex items-center gap-1 hover:bg-red-700"
                                          >
                                              <ShoppingCart size={10} /> Create PO
                                          </button>
                                      </div>
                                  )}

                                  <Button 
                                    variant="outline" 
                                    className="w-full border-blue-200 text-blue-700 hover:bg-blue-50" 
                                    onClick={() => { setSelectedProduct(item); setViewMode('batches'); }}
                                  >
                                    View Batches <ChevronRight size={16} className="ml-1" />
                                  </Button>
                                </Card>
                              ))}
                          </div>
                      </div>
                  ) : (
                      selectedProduct && (
                          <Card className="overflow-hidden border-0 shadow-md">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                        <tr>
                                            <th className="p-4 whitespace-nowrap font-semibold">Batch #</th>
                                            <th className="p-4 whitespace-nowrap font-semibold">Expiry</th>
                                            <th className="p-4 whitespace-nowrap font-semibold">MRP</th>
                                            <th className="p-4 whitespace-nowrap font-semibold">Stock</th>
                                            <th className="p-4 whitespace-nowrap font-semibold">Actions</th>
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
                                                        <Button size="sm" variant="outline" onClick={() => setShowLedger(batch.id)}>
                                                            Ledger
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                          </Card>
                      )
                  )}
              </div>
          )}

          {activeTab === 'ledger' && (
              <div className="space-y-3">
                  {stockLedger.length === 0 ? (
                      <div className="text-center py-10 text-gray-500">
                          <History className="mx-auto mb-2 opacity-20" size={48} />
                          <p>No stock movements recorded.</p>
                      </div>
                  ) : (
                      stockLedger.map(entry => {
                          const product = products.find(p => p.id === entry.productId);
                          const batch = batches.find(b => b.id === entry.batchId);
                          return (
                              <Card key={entry.id} className="p-3">
                                  <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-3">
                                          <div className={`p-2 rounded-full ${entry.type === 'IN' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                              {entry.type === 'IN' ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
                                          </div>
                                          <div>
                                              <p className="font-bold text-gray-900">{product?.name || 'Unknown Product'}</p>
                                              <p className="text-xs text-gray-500">Batch: {batch?.batchNumber || 'N/A'} | {entry.reason}</p>
                                          </div>
                                      </div>
                                      <div className="text-right">
                                          <p className={`font-bold ${entry.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                                              {entry.type === 'IN' ? '+' : '-'}{entry.quantity}
                                          </p>
                                          <p className="text-xs text-gray-400">{new Date(entry.date).toLocaleDateString()}</p>
                                      </div>
                                  </div>
                              </Card>
                          );
                      })
                  )}
              </div>
          )}

          {activeTab === 'po' && (
              <div className="space-y-6">
                  {/* Suppliers Section */}
                  <div className="mb-8">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-gray-800">Suppliers</h3>
                          <Button size="sm" onClick={() => setShowAddSupplier(true)}>
                              <Plus size={16} className="mr-1" /> Add Supplier
                          </Button>
                      </div>
                      
                      {suppliers.length === 0 ? (
                          <div className="text-center p-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                              <p className="text-gray-500 text-sm">No suppliers added yet.</p>
                          </div>
                      ) : (
                          <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
                              {suppliers.map(supplier => (
                                  <Card 
                                    key={supplier.id} 
                                    className={`min-w-[300px] snap-center p-4 cursor-pointer transition-colors group ${selectedSupplierHistory === supplier.id ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50' : 'hover:border-blue-300'}`}
                                  >
                                      <div 
                                        className="flex justify-between items-start"
                                        onClick={() => setSelectedSupplierHistory(supplier.id === selectedSupplierHistory ? null : supplier.id)}
                                      >
                                          <div>
                                              <h4 className="font-bold text-gray-900">{supplier.name}</h4>
                                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{supplier.details}</p>
                                              {supplier.contact && (
                                                  <p className="text-xs text-gray-400 mt-1">{supplier.contact}</p>
                                              )}
                                          </div>
                                          {selectedSupplierHistory === supplier.id && (
                                              <div className="bg-blue-100 text-blue-600 p-1 rounded-full">
                                                  <CheckCircle size={14} />
                                              </div>
                                          )}
                                      </div>
                                      <div 
                                        className="mt-3 pt-3 border-t border-gray-100 text-center hover:bg-gray-50 -mx-4 -mb-4 pb-4 rounded-b-xl transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowCreatePO(supplier.id);
                                        }}
                                      >
                                          <span className="text-xs font-medium text-blue-600 flex items-center justify-center gap-1">
                                            <Plus size={14} /> Click to Create PO
                                          </span>
                                      </div>
                                  </Card>
                              ))}
                          </div>
                      )}
                  </div>

                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-gray-800">
                          {selectedSupplierHistory 
                              ? `Purchase Orders - ${suppliers.find(s => s.id === selectedSupplierHistory)?.name}` 
                              : 'All Purchase Orders History'}
                      </h3>
                      {selectedSupplierHistory && (
                          <Button size="sm" variant="outline" onClick={() => setSelectedSupplierHistory(null)}>
                              <X size={14} className="mr-1" /> Clear Filter
                          </Button>
                      )}
                  </div>
                  
                  {purchaseOrders.filter(po => !selectedSupplierHistory || po.supplierId === selectedSupplierHistory || po.supplierName === suppliers.find(s => s.id === selectedSupplierHistory)?.name).length === 0 ? (
                      <div className="text-center py-10 text-gray-500">
                          <FileText className="mx-auto mb-2 opacity-20" size={48} />
                          <p>No purchase orders found{selectedSupplierHistory ? ' for this supplier' : ''}.</p>
                      </div>
                  ) : (
                      purchaseOrders
                        .filter(po => !selectedSupplierHistory || po.supplierId === selectedSupplierHistory || po.supplierName === suppliers.find(s => s.id === selectedSupplierHistory)?.name)
                        .map(po => (
                          <Card key={po.id} className="p-6 overflow-hidden">
                              {/* PO Header */}
                              <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-100">
                                  <div>
                                      <div className="flex items-center gap-3 mb-1">
                                          <h3 className="font-bold text-xl text-gray-900">PO #{po.id.slice(-6).toUpperCase()}</h3>
                                          <Badge variant={po.status === 'Received' ? 'success' : po.status === 'Draft' ? 'default' : 'warning'}>
                                              {po.status}
                                          </Badge>
                                      </div>
                                      <p className="text-sm text-gray-500">{new Date(po.date).toLocaleDateString()}</p>
                                  </div>
                                  <div className="flex gap-2">
                                      <Button size="sm" variant="outline" onClick={() => handleDownloadPO(po)}>
                                          <Download size={16} className="mr-2" /> PDF
                                      </Button>
                                      {po.status === 'Draft' && (
                                          <Button size="sm" className="bg-blue-600 text-white" onClick={() => updatePurchaseOrderStatus(po.id, 'Sent')}>
                                              <Send size={16} className="mr-2" /> Send
                                          </Button>
                                      )}
                                      {po.status === 'Sent' && (
                                          <Button size="sm" className="bg-green-600 text-white" onClick={() => updatePurchaseOrderStatus(po.id, 'Received')}>
                                              <CheckCircle size={16} className="mr-2" /> Receive
                                          </Button>
                                      )}
                                  </div>
                              </div>

                              {/* Items Table */}
                              <div className="overflow-x-auto mb-4">
                                  <div className="flex justify-between items-center mb-2 px-1">
                                      <h4 className="font-semibold text-gray-700 text-sm">Items</h4>
                                      {po.status === 'Draft' && (
                                          <Button size="xs" variant="outline" onClick={() => setShowAddItemPO(po.id)}>
                                              <Plus size={14} className="mr-1" /> Add Item
                                          </Button>
                                      )}
                                  </div>
                                  <table className="w-full text-sm text-left">
                                      <thead className="bg-gray-50 text-gray-600 font-medium border-y border-gray-200">
                                          <tr>
                                              <th className="py-3 px-4">Code</th>
                                              <th className="py-3 px-4">Item Name</th>
                                              <th className="py-3 px-4 text-right">Rate</th>
                                              <th className="py-3 px-4 text-right">Qty</th>
                                              <th className="py-3 px-4 text-right">Total</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                          {po.items.map((item, idx) => {
                                              const product = products.find(p => p.id === item.productId);
                                              const rate = item.expectedRate || 0;
                                              const total = rate * item.quantity;
                                              return (
                                                  <tr key={idx}>
                                                      <td className="py-3 px-4 font-mono text-gray-500">{product?.code || 'N/A'}</td>
                                                      <td className="py-3 px-4 font-medium text-gray-900">{item.productName}</td>
                                                      <td className="py-3 px-4 text-right text-gray-600">
                                                          {po.status === 'Draft' ? (
                                                              <input 
                                                                  type="number" 
                                                                  className="w-20 text-right border border-gray-200 rounded px-1 py-0.5"
                                                                  value={rate}
                                                                  onChange={(e) => {
                                                                      const newItems = [...po.items];
                                                                      newItems[idx].expectedRate = Number(e.target.value);
                                                                      updatePurchaseOrder(po.id, { items: newItems });
                                                                  }}
                                                              />
                                                          ) : (
                                                              formatCurrency(rate)
                                                          )}
                                                      </td>
                                                      <td className="py-3 px-4 text-right font-medium">{item.quantity}</td>
                                                      <td className="py-3 px-4 text-right font-bold text-gray-900">{formatCurrency(total)}</td>
                                                  </tr>
                                              );
                                          })}
                                      </tbody>
                                      <tfoot className="border-t border-gray-200">
                                          <tr>
                                              <td colSpan={4} className="py-3 px-4 text-right font-bold text-gray-900">Grand Total</td>
                                              <td className="py-3 px-4 text-right font-bold text-blue-600 text-lg">
                                                  {formatCurrency(po.items.reduce((sum, item) => sum + ((item.expectedRate || 0) * item.quantity), 0))}
                                              </td>
                                          </tr>
                                      </tfoot>
                                  </table>
                              </div>
                          </Card>
                      ))
                  )}
              </div>
          )}
      </div>

      {/* Modals */}
      {showLedger && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-2xl p-6 h-[80vh] flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                      <div>
                          <h3 className="font-bold text-lg">Batch Ledger</h3>
                          <p className="text-xs text-gray-500">
                              Batch: {batches.find(b => b.id === showLedger)?.batchNumber}
                          </p>
                      </div>
                      <button onClick={() => setShowLedger(null)}><X size={20} /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3">
                      {stockLedger
                        .filter(l => l.batchId === showLedger)
                        .map(entry => (
                            <div key={entry.id} className="p-3 border border-gray-100 rounded-lg flex justify-between items-center">
                                <div className="flex gap-3">
                                    <div className={`mt-1 p-1.5 rounded-full ${entry.type === 'IN' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        {entry.type === 'IN' ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{entry.reason}</p>
                                        <p className="text-[10px] text-gray-500">{new Date(entry.date).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold ${entry.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                                        {entry.type === 'IN' ? '+' : '-'}{entry.quantity}
                                    </p>
                                </div>
                            </div>
                        ))
                      }
                  </div>
              </div>
          </div>
      )}

      {showAddProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-gray-900">Add New Product</h3>
              <button onClick={() => setShowAddProduct(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateProductWithBatch} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Product Code *" value={combinedForm.code} onChange={e => setCombinedForm({...combinedForm, code: e.target.value})} required />
                <Input label="Product Name *" value={combinedForm.name} onChange={e => setCombinedForm({...combinedForm, name: e.target.value})} required />
              </div>
              <Input label="Batch Number *" value={combinedForm.batchNumber} onChange={e => setCombinedForm({...combinedForm, batchNumber: e.target.value})} required />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Stock *" type="number" value={combinedForm.stock} onChange={e => setCombinedForm({...combinedForm, stock: e.target.value})} required />
                <Input label="Unit" value={combinedForm.unit} onChange={e => setCombinedForm({...combinedForm, unit: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Mfg Date" type="date" value={combinedForm.manufacturingDate} onChange={e => setCombinedForm({...combinedForm, manufacturingDate: e.target.value})} />
                <Input label="Exp Date" type="date" value={combinedForm.expiryDate} onChange={e => setCombinedForm({...combinedForm, expiryDate: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Purchase Rate *" type="number" value={combinedForm.purchaseRate} onChange={e => setCombinedForm({...combinedForm, purchaseRate: e.target.value})} required />
                <Input label="MRP *" type="number" value={combinedForm.mrp} onChange={e => setCombinedForm({...combinedForm, mrp: e.target.value})} required />
              </div>
              <Button type="submit" className="w-full">Add Product</Button>
            </form>
          </div>
        </div>
      )}

      {showAddSupplier && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Add New Supplier</h3>
                    <button onClick={() => setShowAddSupplier(false)}><X size={20} /></button>
                </div>
                <form onSubmit={handleAddSupplier} className="space-y-4">
                    <Input 
                        label="Supplier Name *" 
                        value={supplierForm.name} 
                        onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} 
                        required 
                    />
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Details (Address, GST, etc.) *</label>
                        <textarea 
                            className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            rows={3}
                            value={supplierForm.details}
                            onChange={e => setSupplierForm({...supplierForm, details: e.target.value})}
                            required
                        />
                    </div>
                    <Input 
                        label="Contact Number" 
                        value={supplierForm.contact} 
                        onChange={e => setSupplierForm({...supplierForm, contact: e.target.value})} 
                    />
                    <Button type="submit" className="w-full">Save Supplier</Button>
                </form>
            </div>
        </div>
      )}

      {showCreatePO && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl rounded-2xl p-6 h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                    <div>
                        <h3 className="font-bold text-xl text-gray-900">Create Purchase Order</h3>
                        <p className="text-sm text-gray-500">
                            Supplier: {suppliers.find(s => s.id === showCreatePO)?.name}
                        </p>
                    </div>
                    <button onClick={() => { setShowCreatePO(null); setPoItems([]); }}><X size={24} /></button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Add Item Section */}
                        <div className="lg:col-span-1 bg-gray-50 p-4 rounded-xl h-fit">
                            <h4 className="font-bold text-gray-800 mb-4">Add Item</h4>
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 text-sm"
                                        placeholder="Search product..."
                                        value={poSearch}
                                        onChange={e => {
                                            setPoSearch(e.target.value);
                                            setPoSelectedProduct(null);
                                        }}
                                    />
                                    {poSearch && !poSelectedProduct && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                            {products
                                                .filter(p => p.name.toLowerCase().includes(poSearch.toLowerCase()) || p.code.toLowerCase().includes(poSearch.toLowerCase()))
                                                .map(p => (
                                                    <div 
                                                        key={p.id} 
                                                        className="p-2 hover:bg-gray-50 cursor-pointer text-sm"
                                                        onClick={() => {
                                                            setPoSelectedProduct(p);
                                                            setPoSearch(p.name);
                                                            const latestBatch = batches
                                                                .filter(b => b.productId === p.id)
                                                                .sort((a, b) => new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime())[0];
                                                            setPoRate(latestBatch?.purchaseRate?.toString() || '');
                                                        }}
                                                    >
                                                        <p className="font-medium">{p.name}</p>
                                                        <p className="text-xs text-gray-500">{p.code}</p>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    )}
                                </div>

                                {poSelectedProduct && (
                                    <div className="bg-blue-50 p-3 rounded-lg text-sm border border-blue-100">
                                        <p className="font-medium text-blue-900">{poSelectedProduct.name}</p>
                                        <p className="text-xs text-blue-700">Code: {poSelectedProduct.code}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <Input 
                                        label="Quantity" 
                                        type="number" 
                                        value={poQuantity} 
                                        onChange={e => setPoQuantity(e.target.value)} 
                                    />
                                    <Input 
                                        label="Rate" 
                                        type="number" 
                                        value={poRate} 
                                        onChange={e => setPoRate(e.target.value)} 
                                    />
                                </div>

                                <Button 
                                    className="w-full" 
                                    disabled={!poSelectedProduct || !poQuantity}
                                    onClick={handleAddItemToCreatePO}
                                >
                                    Add to List
                                </Button>
                            </div>
                        </div>

                        {/* PO Preview Section */}
                        <div className="lg:col-span-2">
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                    <h4 className="font-bold text-gray-800">Order Items ({poItems.length})</h4>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500">Total Value</p>
                                        <p className="font-bold text-lg text-blue-600">
                                            {formatCurrency(poItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0))}
                                        </p>
                                    </div>
                                </div>
                                
                                {poItems.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400">
                                        <ShoppingCart size={48} className="mx-auto mb-2 opacity-20" />
                                        <p>No items added yet.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                                                <tr>
                                                    <th className="py-3 px-4">Item</th>
                                                    <th className="py-3 px-4 text-right">Rate</th>
                                                    <th className="py-3 px-4 text-right">Qty</th>
                                                    <th className="py-3 px-4 text-right">Total</th>
                                                    <th className="py-3 px-4"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {poItems.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td className="py-3 px-4 font-medium text-gray-900">{item.productName}</td>
                                                        <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(item.rate)}</td>
                                                        <td className="py-3 px-4 text-right">{item.quantity}</td>
                                                        <td className="py-3 px-4 text-right font-bold text-gray-900">
                                                            {formatCurrency(item.quantity * item.rate)}
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            <button 
                                                                className="text-red-500 hover:text-red-700"
                                                                onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))}
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => { setShowCreatePO(null); setPoItems([]); }}>
                        Cancel
                    </Button>
                    <Button 
                        disabled={poItems.length === 0} 
                        onClick={handleSavePO}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        Save Purchase Order
                    </Button>
                </div>
            </div>
        </div>
      )}

      {showAddBatch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6">
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
              <Input label="Stock" type="number" value={batchForm.stock} onChange={e => setBatchForm({...batchForm, stock: e.target.value})} required />
              <Button type="submit" className="w-full">Add Batch Stock</Button>
            </form>
          </div>
        </div>
      )}

      {showAddItemPO && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Add Item to PO</h3>
                    <button onClick={() => setShowAddItemPO(null)}><X size={20} /></button>
                </div>
                <form onSubmit={handleAddItemToPO} className="space-y-4">
                    {/* Product Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="Search product..."
                            value={addItemSearch}
                            onChange={e => {
                                setAddItemSearch(e.target.value);
                                setAddItemSelectedProduct(null);
                            }}
                        />
                        {addItemSearch && !addItemSelectedProduct && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {products
                                    .filter(p => p.name.toLowerCase().includes(addItemSearch.toLowerCase()) || p.code.toLowerCase().includes(addItemSearch.toLowerCase()))
                                    .map(p => (
                                        <div 
                                            key={p.id} 
                                            className="p-2 hover:bg-gray-50 cursor-pointer text-sm"
                                            onClick={() => {
                                                setAddItemSelectedProduct(p);
                                                setAddItemSearch(p.name);
                                                // Try to find latest batch rate
                                                const latestBatch = batches
                                                    .filter(b => b.productId === p.id)
                                                    .sort((a, b) => new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime())[0];
                                                setAddItemRate(latestBatch?.purchaseRate?.toString() || '');
                                            }}
                                        >
                                            <p className="font-medium">{p.name}</p>
                                            <p className="text-xs text-gray-500">{p.code}</p>
                                        </div>
                                    ))
                                }
                            </div>
                        )}
                    </div>
                    
                    {addItemSelectedProduct && (
                        <div className="bg-blue-50 p-3 rounded-lg text-sm border border-blue-100">
                            <p className="font-medium text-blue-900">{addItemSelectedProduct.name}</p>
                            <p className="text-xs text-blue-700">Code: {addItemSelectedProduct.code}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Quantity" 
                            type="number" 
                            value={addItemQuantity} 
                            onChange={e => setAddItemQuantity(e.target.value)} 
                            required 
                        />
                        <Input 
                            label="Rate" 
                            type="number" 
                            value={addItemRate} 
                            onChange={e => setAddItemRate(e.target.value)} 
                            required 
                        />
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={!addItemSelectedProduct}>Add to Order</Button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}
