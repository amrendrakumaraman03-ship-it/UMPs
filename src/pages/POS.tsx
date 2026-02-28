import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Button, Input, Card, Badge } from '../components/ui';
import { formatCurrency } from '../utils';
import { Search, Trash2, Plus, Minus, CreditCard, Banknote, Smartphone, User, X, ShoppingBag, AlertCircle, Calendar, Percent } from 'lucide-react';
import { Product, CartItem, PaymentMode, Customer, Batch } from '../types';

export default function POS() {
  const { products, batches, addOrder, customers, addCustomer } = useStore();
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
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Search Bar */}
      <div className="relative mb-4 z-20">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 shadow-sm"
            placeholder="Search item..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        
        {/* Search Results */}
        {filteredProducts.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
            {filteredProducts.map(product => {
               const totalStock = batches.filter(b => b.productId === product.id).reduce((sum, b) => sum + b.stock, 0);
               return (
                <button
                  key={product.id}
                  className="w-full p-3 text-left hover:bg-gray-50 flex justify-between items-center border-b border-gray-50 last:border-0"
                  onClick={() => addToCart(product)}
                >
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-500">Code: {product.code}</p>
                  </div>
                  <div className="text-right">
                    <span className={`font-semibold ${totalStock > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                      {totalStock} {product.unit}
                    </span>
                    {totalStock === 0 && <p className="text-[10px] text-red-500">Out of Stock</p>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart List */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
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
                            title="Remove Item"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                    {item.discount && item.discount > 0 ? (
                        <>
                            <span className="text-xs text-gray-400 line-through">{formatCurrency(item.mrp)}</span>
                            <span className="text-xs font-bold text-green-600">{formatCurrency(item.finalPrice)}</span>
                            <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded">
                                -{formatCurrency(item.discount)} OFF
                            </span>
                        </>
                    ) : (
                        <p className="text-xs text-gray-500">{formatCurrency(item.mrp)} x {item.quantity}</p>
                    )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-gray-100 rounded-lg">
                  <button 
                    className="p-2 hover:bg-gray-200 rounded-l-lg text-gray-600"
                    onClick={() => updateQuantity(item.batchId, -1)}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                  <button 
                    className="p-2 hover:bg-gray-200 rounded-r-lg text-gray-600"
                    onClick={() => updateQuantity(item.batchId, 1)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="text-right min-w-[60px]">
                  <p className="font-semibold text-gray-900">{formatCurrency(item.finalPrice * item.quantity)}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Bottom Action Area */}
      <div className="bg-white border-t border-gray-200 pt-4 -mx-4 px-4 pb-2">
        {/* Date Selector */}
        <div className="flex items-center justify-between mb-3 bg-gray-50 p-2 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={16} />
                <span>Billing Date</span>
            </div>
            <input 
                type="date" 
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="bg-transparent text-sm font-medium text-gray-900 focus:outline-none text-right"
            />
        </div>

        {/* Customer Selector */}
        <div className="flex items-center justify-between mb-3 bg-gray-50 p-2 rounded-lg">
            {selectedCustomer ? (
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        <User size={16} className="text-blue-600"/>
                        <span className="font-medium text-sm">{selectedCustomer.name}</span>
                    </div>
                    <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-red-500">
                        <X size={16} />
                    </button>
                </div>
            ) : (
                <button 
                    onClick={() => setShowCustomerModal(true)}
                    className="flex items-center gap-2 text-sm text-blue-600 w-full"
                >
                    <Plus size={16} />
                    <span>Add Customer to Bill</span>
                </button>
            )}
        </div>

        <div className="flex justify-between items-end mb-4">
          <div className="text-sm text-gray-500">
            <p>Items: {cart.length}</p>
            <p>Tax (Inc.): {formatCurrency(totals.tax)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase font-semibold">Total Payable</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.total)}</p>
          </div>
        </div>

        <Button 
          size="lg" 
          className="w-full h-14 text-lg" 
          disabled={cart.length === 0}
          onClick={() => setShowPayment(true)}
        >
          Complete Sale
        </Button>
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
