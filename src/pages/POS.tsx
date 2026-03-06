import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Button, Input, Card, Badge } from '../components/ui';
import { formatCurrency } from '../utils';
import { Search, Trash2, Plus, Minus, CreditCard, Banknote, Smartphone, User, X, ShoppingBag, AlertCircle, Calendar, Percent } from 'lucide-react';
import { Product, CartItem, PaymentMode, Customer, Batch } from '../types';

export default function POS() {
  const { products, batches, addOrder, customers, addCustomer, orders } = useStore();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState<{batchId: string, currentDiscount: number, mrp: number} | null>(null);
  const [discountInput, setDiscountInput] = useState('');
  const [billDate, setBillDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  });
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Filter products for search
  const filteredProducts = useMemo(() => {
    if (!search) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.code.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 5);
  }, [search, products]);

  // FEFO Logic: Find batches for product, sort by expiry, allocate stock
  const addToCart = (product: Product) => {
    // 1. Get all batches for this product with stock > 0 OR onlineStock > 0
    const availableBatches = batches
      .filter(b => b.productId === product.id && (b.stock > 0 || (b.onlineStock || 0) > 0))
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    if (availableBatches.length === 0) {
      alert('Out of stock!');
      return;
    }

    // 2. Check if product is already in cart to see how much we've already taken
    const inCartQty = cart.filter(item => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0);
    
    // 3. Find the next batch to take from
    let needed = inCartQty + 1;
    let selectedBatch: Batch | null = null;
    
    for (const batch of availableBatches) {
      const totalAvailable = batch.stock + (batch.onlineStock || 0);
      if (totalAvailable >= needed) {
        selectedBatch = batch;
        break;
      } else {
        needed -= totalAvailable;
      }
    }

    if (!selectedBatch) {
      alert('Insufficient stock for requested quantity');
      return;
    }

    // Warning Logic from Note
    const physicalStock = selectedBatch.stock;
    const booked = selectedBatch.bookedStock || 0;
    const online = selectedBatch.onlineStock || 0;
    
    if (physicalStock <= 0 && online > 0) {
        if (!confirm(`Physical stock is 0 in system, but Online Inventory has ${online} units. Using Online Inventory for this sale. Proceed?`)) {
            return;
        }
    } else if (physicalStock <= booked && booked > 0) {
        if (!confirm(`WARNING: This item is booked for an online order. Selling it will trigger the "Order Fail Protocol" (Penalty Warning). Do you want to proceed?`)) {
            return;
        }
    } else if (physicalStock <= 5) {
        alert(`Warning: Low physical stock (${physicalStock} left).`);
    }

    // 4. Add to cart (or increment if same batch exists)
    setCart(prev => {
      const existingItemIndex = prev.findIndex(item => item.batchId === selectedBatch!.id);
      
      // Calculate Discount
      let discountAmount = 0;
      let finalPrice = selectedBatch!.mrp;
      
      if (selectedBatch!.discount?.enabled) {
        if (selectedBatch!.discount.type === 'PERCENTAGE') {
          discountAmount = (selectedBatch!.mrp * selectedBatch!.discount.value) / 100;
        } else {
          discountAmount = selectedBatch!.discount.value;
        }
        finalPrice = selectedBatch!.mrp - discountAmount;
      }

      if (existingItemIndex >= 0) {
        const newCart = [...prev];
        newCart[existingItemIndex].quantity += 1;
        return newCart;
      } else {
        return [...prev, {
          productId: product.id,
          batchId: selectedBatch!.id,
          name: product.name,
          batchNumber: selectedBatch!.batchNumber,
          expiryDate: selectedBatch!.expiryDate,
          mrp: selectedBatch!.mrp,
          quantity: 1,
          gstRate: product.gstRate,
          discount: discountAmount,
          finalPrice: finalPrice
        }];
      }
    });
    setSearch('');
  };

  const deleteItem = (batchId: string) => {
    setCart(prev => prev.filter(item => item.batchId !== batchId));
  };

  const handleDiscountClick = (item: CartItem) => {
    setShowDiscountModal({ batchId: item.batchId, currentDiscount: item.discount || 0, mrp: item.mrp });
    setDiscountInput((item.discount || 0).toString());
  };

  const applyDiscount = () => {
    if (!showDiscountModal) return;
    
    const discountValue = parseFloat(discountInput);
    if (isNaN(discountValue) || discountValue < 0) {
      alert('Please enter a valid discount amount');
      return;
    }

    if (discountValue > showDiscountModal.mrp) {
      alert('Discount cannot be greater than MRP');
      return;
    }

    setCart(prev => prev.map(item => {
      if (item.batchId === showDiscountModal.batchId) {
        return {
          ...item,
          discount: discountValue,
          finalPrice: item.mrp - discountValue
        };
      }
      return item;
    }));

    setShowDiscountModal(null);
    setDiscountInput('');
  };

  const updateQuantity = (batchId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.batchId === batchId) {
        // Check stock limit if increasing
        if (delta > 0) {
           const batch = batches.find(b => b.id === batchId);
           if (batch && item.quantity >= batch.stock) {
             alert('Max stock reached for this batch');
             return item;
           }
        }
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
    // Tax calculation based on discounted price
    const tax = cart.reduce((sum, item) => {
      const taxPortion = (item.finalPrice * item.quantity * item.gstRate) / (100 + item.gstRate);
      return sum + taxPortion;
    }, 0);
    
    return { subtotal: subtotal - tax, tax, total: subtotal };
  }, [cart]);

  const handleCheckout = (mode: PaymentMode) => {
    if (mode === 'Credit' && !selectedCustomer) {
      alert('Please select a customer for credit sales');
      return;
    }

    // Construct date with current time to preserve ordering and local date
    const now = new Date();
    const timePart = now.toTimeString().split(' ')[0]; // HH:MM:SS
    const localDateTime = new Date(`${billDate}T${timePart}`);
    
    addOrder({
      items: cart,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      paymentMode: mode,
      status: 'Completed',
      type: 'Offline',
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      date: localDateTime.toISOString()
    });

    setCart([]);
    setShowPayment(false);
    setSelectedCustomer(null);
  };

  const handleCreateCustomer = () => {
      if(newCustomerName && newCustomerPhone) {
          const newCus = addCustomer({
              name: newCustomerName,
              mobile: newCustomerPhone
          });
          setSelectedCustomer(newCus);
          setShowCustomerModal(false);
          setNewCustomerName('');
          setNewCustomerPhone('');
      }
  }

  return (
    <div className="h-[calc(100vh-8rem)] lg:h-[calc(100vh-12rem)] flex flex-col lg:flex-row gap-6">
      {/* Left Column: Search and Product Selection (Desktop) / Main View (Mobile) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search Bar */}
        <div className="relative mb-4 z-20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
              placeholder="Search item (S)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          
          {/* Search Results */}
          {filteredProducts.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-30 animate-in fade-in slide-in-from-top-2 duration-200">
              {filteredProducts.map(product => {
                 const totalStock = batches.filter(b => b.productId === product.id).reduce((sum, b) => sum + b.stock, 0);
                 return (
                  <button
                    key={product.id}
                    className="w-full p-4 text-left hover:bg-blue-50 flex justify-between items-center border-b border-gray-50 last:border-0 transition-colors group"
                    onClick={() => addToCart(product)}
                  >
                    <div>
                      <p className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{product.name}</p>
                      <p className="text-xs text-gray-500">Code: {product.code}</p>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold text-lg ${totalStock > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                        {totalStock} <span className="text-xs font-normal text-gray-400">{product.unit}</span>
                      </span>
                      {totalStock === 0 && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tighter">Out of Stock</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart List (Mobile View) */}
        <div className="flex-1 overflow-y-auto space-y-3 pb-4 lg:hidden">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ShoppingBag size={48} className="mb-2 opacity-20" />
              <p>Cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <Card key={item.batchId} className="p-3 flex justify-between items-center">
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                      <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="bg-gray-100 px-1.5 rounded">Batch: {item.batchNumber}</span>
                          <span className={new Date(item.expiryDate) < new Date() ? 'text-red-500 font-bold' : ''}>
                              Exp: {new Date(item.expiryDate).toLocaleDateString()}
                          </span>
                          </div>
                      </div>
                      <div className="flex gap-1">
                          <button 
                              onClick={() => handleDiscountClick(item)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Add Discount"
                          >
                              <Percent size={16} />
                          </button>
                          <button 
                              onClick={() => deleteItem(item.batchId)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                              <Trash2 size={16} />
                          </button>
                      </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                      <button 
                        onClick={() => updateQuantity(item.batchId, -1)}
                        className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="font-bold w-6 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.batchId, 1)}
                        className="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 line-through">
                        {item.discount && item.discount > 0 && formatCurrency(item.mrp * item.quantity)}
                      </p>
                      <p className="font-bold text-gray-900">
                        {formatCurrency(item.finalPrice * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Desktop View: Quick Stats & Shortcuts */}
        <div className="hidden lg:block flex-1">
           <div className="grid grid-cols-2 gap-4">
              <Card className="p-6 bg-blue-50 border-blue-100">
                 <h3 className="text-blue-600 font-bold uppercase text-xs mb-2">Today's Sales</h3>
                 <p className="text-3xl font-black text-gray-900">{formatCurrency(orders.filter(o => o.date.startsWith(new Date().toISOString().split('T')[0])).reduce((s, o) => s + o.total, 0))}</p>
              </Card>
              <Card className="p-6 bg-green-50 border-green-100">
                 <h3 className="text-green-600 font-bold uppercase text-xs mb-2">Inventory Value</h3>
                 <p className="text-3xl font-black text-gray-900">{formatCurrency(batches.reduce((s, b) => s + (b.stock * b.purchaseRate), 0))}</p>
              </Card>
           </div>
           
           <div className="mt-8">
              <h3 className="font-bold text-gray-900 mb-4">Quick Shortcuts</h3>
              <div className="grid grid-cols-2 gap-3">
                 <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
                    <span className="text-sm text-gray-500">Focus Search</span>
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-bold">S</kbd>
                 </div>
                 <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
                    <span className="text-sm text-gray-500">Checkout</span>
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-bold">Enter</kbd>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Right Column: Cart and Checkout (Desktop Only) / Floating Summary (Mobile) */}
      <div className="w-full lg:w-96 flex flex-col bg-white lg:rounded-2xl lg:shadow-xl lg:border lg:border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag size={20} className="text-blue-600" />
            Current Cart
            <Badge variant="default" className="ml-1">{cart.length}</Badge>
          </h2>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-xs text-red-500 hover:underline font-medium">Clear All</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 hidden lg:block">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
              <ShoppingBag size={48} className="mb-2" />
              <p className="text-sm">Cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.batchId} className="group">
                <div className="flex justify-between items-start mb-1">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 truncate text-sm">{item.name}</p>
                    <p className="text-[10px] text-gray-400">Batch: {item.batchNumber} • Exp: {new Date(item.expiryDate).toLocaleDateString()}</p>
                  </div>
                  <button 
                    onClick={() => deleteItem(item.batchId)}
                    className="p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                    <button onClick={() => updateQuantity(item.batchId, -1)} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-gray-400 hover:text-blue-600"><Minus size={12} /></button>
                    <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.batchId, 1)} className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-gray-400 hover:text-blue-600"><Plus size={12} /></button>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-900">{formatCurrency(item.finalPrice * item.quantity)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout Summary */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-3">
          {/* Date Selector */}
          <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase font-bold">
                  <Calendar size={12} />
                  <span>Date</span>
              </div>
              <input 
                  type="date" 
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-gray-900 focus:outline-none text-right"
              />
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Tax (GST)</span>
            <span className="font-medium">{formatCurrency(totals.tax)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="font-bold text-gray-900">Total Amount</span>
            <span className="text-xl font-black text-blue-600">{formatCurrency(totals.total)}</span>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setShowCustomerModal(true)}
            >
              <User size={18} className="mr-2" />
              {selectedCustomer ? selectedCustomer.name : 'Customer'}
            </Button>
            <Button 
              className="flex-[2] shadow-lg shadow-blue-100"
              disabled={cart.length === 0}
              onClick={() => setShowPayment(true)}
            >
              <CreditCard size={18} className="mr-2" />
              Checkout
            </Button>
          </div>
        </div>
      </div>

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xs rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Apply Discount</h3>
              <button onClick={() => setShowDiscountModal(null)}><X size={20} /></button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">Original Price (MRP): {formatCurrency(showDiscountModal.mrp)}</p>
              <Input 
                label="Discount Amount (₹)" 
                type="number" 
                value={discountInput} 
                onChange={(e) => setDiscountInput(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">
                Final Price: {formatCurrency(Math.max(0, showDiscountModal.mrp - (parseFloat(discountInput) || 0)))}
              </p>
            </div>

            <Button className="w-full" onClick={applyDiscount}>
              Apply Discount
            </Button>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Select Payment Mode</h3>
              <button onClick={() => setShowPayment(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button 
                onClick={() => handleCheckout('Cash')}
                className="p-4 rounded-xl border border-gray-200 hover:border-green-500 hover:bg-green-50 flex flex-col items-center gap-2 transition-colors"
              >
                <Banknote className="text-green-600" size={28} />
                <span className="font-medium">Cash</span>
              </button>
              <button 
                onClick={() => handleCheckout('UPI')}
                className="p-4 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50 flex flex-col items-center gap-2 transition-colors"
              >
                <Smartphone className="text-blue-600" size={28} />
                <span className="font-medium">UPI</span>
              </button>
              <button 
                onClick={() => handleCheckout('Card')}
                className="p-4 rounded-xl border border-gray-200 hover:border-purple-500 hover:bg-purple-50 flex flex-col items-center gap-2 transition-colors"
              >
                <CreditCard className="text-purple-600" size={28} />
                <span className="font-medium">Card</span>
              </button>
              <button 
                onClick={() => handleCheckout('Credit')}
                className="p-4 rounded-xl border border-gray-200 hover:border-orange-500 hover:bg-orange-50 flex flex-col items-center gap-2 transition-colors"
              >
                <User className="text-orange-600" size={28} />
                <span className="font-medium">Credit</span>
              </button>
            </div>

            <div className="text-center text-gray-500 text-sm">
              Total Amount: <span className="font-bold text-gray-900">{formatCurrency(totals.total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Customer Selection Modal */}
      {showCustomerModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-sm rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold">Select Customer</h3>
                      <button onClick={() => setShowCustomerModal(false)}><X size={20}/></button>
                  </div>
                  
                  <div className="mb-4">
                      <Input 
                          placeholder="Search customer..." 
                          value={newCustomerName} // Reusing state for search for simplicity or create new state
                          onChange={(e) => setNewCustomerName(e.target.value)}
                          className="mb-2"
                      />
                      <div className="max-h-40 overflow-y-auto space-y-2">
                          {customers
                              .filter(c => c.name.toLowerCase().includes(newCustomerName.toLowerCase()))
                              .map(c => (
                                  <button 
                                      key={c.id}
                                      onClick={() => { setSelectedCustomer(c); setShowCustomerModal(false); }}
                                      className="w-full text-left p-2 hover:bg-gray-50 rounded flex justify-between"
                                  >
                                      <span>{c.name}</span>
                                      <span className="text-gray-500 text-xs">{c.mobile}</span>
                                  </button>
                              ))
                          }
                      </div>
                  </div>

                  <div className="border-t pt-4">
                      <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Or Create New</p>
                      <div className="space-y-2">
                          <Input placeholder="Name" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} />
                          <Input placeholder="Phone" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} />
                          <Button className="w-full" onClick={handleCreateCustomer} disabled={!newCustomerName || !newCustomerPhone}>
                              Add & Select
                          </Button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
