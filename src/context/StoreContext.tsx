import React, { createContext, useContext, useState, useEffect } from 'react';
import { StoreProfile, Product, Batch, Order, Customer, Expense, LedgerEntry, StockLedgerEntry, PurchaseOrder, Supplier, DailyLedgerRecord, VendorPost } from '../types';
import { generateId } from '../utils';
import { supabase } from '../lib/supabase';

interface StoreContextType {
  store: StoreProfile | null;
  setStore: (store: StoreProfile) => void;
  
  products: Product[];
  batches: Batch[];
  addProduct: (product: Omit<Product, 'id'>) => Product;
  addBatch: (batch: Omit<Batch, 'id'>, product?: Product) => void;
  updateBatchStock: (batchId: string, quantity: number) => void;
  updateBatchDiscount: (batchId: string, discount: Batch['discount']) => void;
  updateBatchOnlineStatus: (batchId: string, status: 'OFFLINE' | 'DRAFT' | 'LIVE', onlineStock?: number) => void;
  
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'date'> & { date?: string }) => void;
  updateOrderStatus: (id: string, status: Order['status']) => void;
  returnOrder: (id: string) => void;
  
  stockLedger: StockLedgerEntry[];
  purchaseOrders: PurchaseOrder[];
  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'date'>) => void;
  updatePurchaseOrderStatus: (id: string, status: PurchaseOrder['status']) => void;
  updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => void;
  
  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, 'id'>) => void;

  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'balance' | 'history' | 'ledger'>) => Customer;
  updateCustomerBalance: (id: string, amount: number) => void;
  addLedgerEntry: (entry: Omit<LedgerEntry, 'id' | 'date'>) => void;
  
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  
  dailyLedgers: DailyLedgerRecord[];
  saveDailyLedger: (ledger: Omit<DailyLedgerRecord, 'id'>) => void;
  
  vendorPosts: VendorPost[];
  addVendorPost: (post: Omit<VendorPost, 'id' | 'createdAt' | 'storeId'>) => void;
  updateStoreProfile: (updates: Partial<StoreProfile>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  
  resetStore: () => void;
  syncStatus: 'synced' | 'syncing' | 'error';
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [store, setStoreState] = useState<StoreProfile | null>(() => {
    try {
      const saved = localStorage.getItem('umps_store');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('umps_products');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  const [batches, setBatches] = useState<Batch[]>(() => {
    try {
      const saved = localStorage.getItem('umps_batches');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('umps_orders');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem('umps_customers');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem('umps_expenses');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  const [stockLedger, setStockLedger] = useState<StockLedgerEntry[]>(() => {
    try {
      const saved = localStorage.getItem('umps_stock_ledger');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    try {
      const saved = localStorage.getItem('umps_purchase_orders');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    try {
      const saved = localStorage.getItem('umps_suppliers');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  const [dailyLedgers, setDailyLedgers] = useState<DailyLedgerRecord[]>(() => {
    try {
      const saved = localStorage.getItem('umps_daily_ledgers');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  const [vendorPosts, setVendorPosts] = useState<VendorPost[]>(() => {
    try {
      const saved = localStorage.getItem('umps_vendor_posts');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  const [isInitialized, setIsInitialized] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

  // Initial Sync from Supabase
  useEffect(() => {
    // ... existing init code ...
    const initSupabase = async () => {
      try {
        const { data, error } = await supabase.from('app_state').select('data').eq('id', 'main_store').single();
        if (data && data.data) {
          const state = data.data;
          if (state.store) setStoreState(state.store);
          if (state.products) setProducts(state.products);
          if (state.batches) setBatches(state.batches);
          
          // Fetch sales directly from Supabase
          try {
            const { data: salesData, error: salesError } = await supabase.from('sales').select('*');
            if (!salesError && salesData && salesData.length > 0) {
              const ordersMap = new Map<string, Order>();
              salesData.forEach(sale => {
                // Handle both old schema (one row per order with items array) and new schema (one row per item)
                const orderId = sale.order_id || sale.id;
                if (!ordersMap.has(orderId)) {
                  ordersMap.set(orderId, {
                    id: orderId,
                    customerId: '',
                    customerName: sale.customer_name || 'Walk-in',
                    items: [],
                    total: 0,
                    subtotal: 0,
                    tax: 0,
                    status: sale.status || 'Completed',
                    paymentMode: sale.payment_mode || 'Cash',
                    type: sale.order_type || 'Offline',
                    date: sale.date || new Date().toISOString()
                  });
                }
                const order = ordersMap.get(orderId)!;
                
                if (sale.items && Array.isArray(sale.items)) {
                  // Old schema
                  order.items = sale.items;
                  order.total = sale.total_amount || sale.total || 0;
                } else if (sale.item_id) {
                  // New schema
                  order.items.push({
                    productId: '',
                    batchId: sale.item_id,
                    name: sale.product_name || 'Item',
                    quantity: sale.quantity || 1,
                    mrp: (sale.total_amount || 0) / (sale.quantity || 1),
                    finalPrice: (sale.total_amount || 0) / (sale.quantity || 1),
                    gstRate: 0,
                    batchNumber: '',
                    expiryDate: ''
                  });
                  order.total += (sale.total_amount || 0);
                }
              });
              setOrders(Array.from(ordersMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            } else if (state.orders) {
              setOrders(state.orders);
            }
          } catch (e) {
            console.error("Error fetching sales:", e);
            if (state.orders) setOrders(state.orders);
          }

          if (state.customers) setCustomers(state.customers);
          if (state.expenses) setExpenses(state.expenses);
          if (state.stockLedger) setStockLedger(state.stockLedger);
          if (state.purchaseOrders) setPurchaseOrders(state.purchaseOrders);
          if (state.suppliers) setSuppliers(state.suppliers);
          if (state.dailyLedgers) setDailyLedgers(state.dailyLedgers);
          if (state.vendorPosts) setVendorPosts(state.vendorPosts);
        } else if (store) {
          // No data in Supabase, but we have local data. Push to Supabase.
          const appState = {
            store, products, batches, orders, customers, expenses, stockLedger, purchaseOrders, suppliers, dailyLedgers, vendorPosts
          };
          await supabase.from('app_state').upsert({ id: 'main_store', data: appState, updated_at: new Date().toISOString() });
        }
      } catch (e) {
        console.error("Failed to sync with Supabase on mount", e);
      } finally {
        setIsInitialized(true);
      }
    };
    initSupabase();

    // Setup Offline Sync Listener
    const handleOnline = () => {
        console.log("Back online! Syncing offline queue...");
        const queueStr = localStorage.getItem('umps_offline_stock_queue');
        if (queueStr) {
            try {
                const queue: { batchNumber: string, updates: any }[] = JSON.parse(queueStr);
                queue.forEach(async (item) => {
                    await supabase.from('inventory').update(item.updates).eq('batch_number', item.batchNumber);
                });
                localStorage.removeItem('umps_offline_stock_queue');
            } catch (e) {
                console.error("Failed to sync offline queue", e);
            }
        }
    };
    window.addEventListener('online', handleOnline);

    // Setup Supabase Realtime Listener for New Orders
    const salesSubscription = supabase
      .channel('public:sales')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sales' }, (payload) => {
        const newSale = payload.new;
        if (newSale.order_type === 'Online') {
          // Play a ding sound
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(e => console.error("Audio play failed:", e));
          
          // Show a simple alert (or could use a toast library if available)
          alert(`New Online Order Received from ${newSale.customer_name || 'Customer'}!`);
          
          // Note: In a real app, we would fetch the full order details here and add it to the state.
          // For now, we rely on the user refreshing or we could trigger a re-fetch of orders.
        }
      })
      .subscribe();

    return () => {
      window.removeEventListener('online', handleOnline);
      supabase.removeChannel(salesSubscription);
    };
  }, []);

  const queueOfflineStockUpdate = async (batchNumber: string, updates: any) => {
      if (navigator.onLine) {
          try {
              const { error } = await supabase.from('inventory').update(updates).eq('batch_number', batchNumber);
              if (error) throw error;
          } catch (error) {
              console.error("Error updating inventory bucket, queuing offline:", error);
              addToOfflineQueue(batchNumber, updates);
          }
      } else {
          addToOfflineQueue(batchNumber, updates);
      }
  };

  const addToOfflineQueue = (batchNumber: string, updates: any) => {
      const queueStr = localStorage.getItem('umps_offline_stock_queue');
      const queue: { batchNumber: string, updates: any }[] = queueStr ? JSON.parse(queueStr) : [];
      
      // Merge updates for the same batch
      const existingIndex = queue.findIndex(q => q.batchNumber === batchNumber);
      if (existingIndex >= 0) {
          queue[existingIndex].updates = { ...queue[existingIndex].updates, ...updates };
      } else {
          queue.push({ batchNumber, updates });
      }
      
      localStorage.setItem('umps_offline_stock_queue', JSON.stringify(queue));
  };

  // Persistence
  useEffect(() => {
    if (!isInitialized) return; // Wait for initial sync

    if (store) localStorage.setItem('umps_store', JSON.stringify(store));
    else localStorage.removeItem('umps_store');
    
    localStorage.setItem('umps_products', JSON.stringify(products));
    localStorage.setItem('umps_batches', JSON.stringify(batches));
    // localStorage.setItem('umps_orders', JSON.stringify(orders)); // Stopped using LocalStorage for completed sales
    localStorage.setItem('umps_customers', JSON.stringify(customers));
    localStorage.setItem('umps_expenses', JSON.stringify(expenses));
    localStorage.setItem('umps_stock_ledger', JSON.stringify(stockLedger));
    localStorage.setItem('umps_purchase_orders', JSON.stringify(purchaseOrders));
    localStorage.setItem('umps_suppliers', JSON.stringify(suppliers));
    localStorage.setItem('umps_daily_ledgers', JSON.stringify(dailyLedgers));
    localStorage.setItem('umps_vendor_posts', JSON.stringify(vendorPosts));

    // Sync to Supabase
    if (store) {
      setSyncStatus('syncing');
      const appState = {
        store, products, batches, customers, expenses, stockLedger, purchaseOrders, suppliers, dailyLedgers, vendorPosts
      };
      supabase.from('app_state').upsert({ id: 'main_store', data: appState, updated_at: new Date().toISOString() })
        .then(({ error }) => {
          if (error) setSyncStatus('error');
          else setSyncStatus('synced');
        });
    }
  }, [isInitialized, store, products, batches, orders, customers, expenses, stockLedger, purchaseOrders, suppliers, dailyLedgers, vendorPosts]);

  // Realtime Order Listener
  useEffect(() => {
    if (!isInitialized) return;

    const notifiedOrders = new Set<string>();

    const channel = supabase
      .channel('public:sales')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sales' },
        (payload) => {
          const newSale = payload.new;
          if (newSale.order_type === 'Online') {
            const orderId = newSale.order_id || newSale.id;
            
            if (!notifiedOrders.has(orderId)) {
                notifiedOrders.add(orderId);
                // Play sound
                try {
                    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const oscillator = audioCtx.createOscillator();
                    const gainNode = audioCtx.createGain();
                    oscillator.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
                    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                    oscillator.start();
                    oscillator.stop(audioCtx.currentTime + 0.5);
                } catch(e) {
                    console.error("Audio play failed", e);
                }
                
                alert(`New Online Order Received from ${newSale.customer_name || 'Customer'}!`);
            }
            
            // Add to state
            setOrders(prev => {
                const existingOrderIndex = prev.findIndex(o => o.id === orderId);
                if (existingOrderIndex >= 0) {
                    const existingOrder = prev[existingOrderIndex];
                    // Check if item already exists
                    if (existingOrder.items.some(i => i.batchId === newSale.item_id)) {
                        return prev;
                    }
                    const updatedOrder = { ...existingOrder };
                    updatedOrder.items = [...updatedOrder.items, {
                        productId: '',
                        batchId: newSale.item_id,
                        name: newSale.product_name || 'Item',
                        quantity: newSale.quantity || 1,
                        mrp: (newSale.total_amount || 0) / (newSale.quantity || 1),
                        finalPrice: (newSale.total_amount || 0) / (newSale.quantity || 1),
                        gstRate: 0,
                        batchNumber: '',
                        expiryDate: ''
                    }];
                    updatedOrder.total += (newSale.total_amount || 0);
                    
                    const newOrders = [...prev];
                    newOrders[existingOrderIndex] = updatedOrder;
                    return newOrders;
                } else {
                    const newOrder: Order = {
                        id: orderId,
                        customerId: '',
                        customerName: newSale.customer_name || 'Walk-in',
                        items: [{
                            productId: '',
                            batchId: newSale.item_id,
                            name: newSale.product_name || 'Item',
                            quantity: newSale.quantity || 1,
                            mrp: (newSale.total_amount || 0) / (newSale.quantity || 1),
                            finalPrice: (newSale.total_amount || 0) / (newSale.quantity || 1),
                            gstRate: 0,
                            batchNumber: '',
                            expiryDate: ''
                        }],
                        total: newSale.total_amount || 0,
                        subtotal: 0,
                        tax: 0,
                        status: newSale.status || 'Pending',
                        paymentMode: newSale.payment_mode || 'Cash',
                        type: newSale.order_type || 'Online',
                        date: newSale.date || new Date().toISOString()
                    };
                    return [newOrder, ...prev];
                }
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isInitialized]);

  // Actions
  const setStore = (data: StoreProfile) => setStoreState(data);

  const addProduct = (productData: Omit<Product, 'id'>) => {
    const newProduct = { ...productData, id: generateId() };
    setProducts(prev => [...prev, newProduct]);
    return newProduct;
  };

  const addBatch = (batchData: Omit<Batch, 'id'>, product?: Product) => {
    const newBatch = { ...batchData, id: generateId() };
    setBatches(prev => [...prev, newBatch]);
    
    // Record Stock Ledger Entry
    const ledgerEntry: StockLedgerEntry = {
      id: generateId(),
      productId: batchData.productId,
      batchId: newBatch.id,
      date: new Date().toISOString(),
      type: 'IN',
      quantity: batchData.stock,
      reason: 'Purchase/Initial Stock',
      referenceId: newBatch.id
    };
    setStockLedger(prev => [ledgerEntry, ...prev]);

    // Write directly to Supabase inventory table
    const foundProduct = product || products.find(p => p.id === batchData.productId);
    if (foundProduct) {
      supabase.from('inventory').insert({
        id: newBatch.id,
        product_name: foundProduct.name,
        sub_category: foundProduct.subCategory,
        batch_number: newBatch.batchNumber,
        expiry_date: newBatch.expiryDate,
        mrp: newBatch.mrp,
        purchase_rate: newBatch.purchaseRate,
        qty_offline: newBatch.stock,
        qty_online: newBatch.onlineStock || 0
      }).then(({ error }) => {
        if (error) console.error("Error inserting into inventory table:", error);
      });
    }
  };

  const updateBatchStock = (batchId: string, quantity: number) => {
    setBatches(prev => prev.map(b => {
      if (b.id !== batchId) return b;
      
      const diff = quantity - b.stock;
      if (diff !== 0) {
          // Record Stock Ledger Entry
          const ledgerEntry: StockLedgerEntry = {
            id: generateId(),
            productId: b.productId,
            batchId: b.id,
            date: new Date().toISOString(),
            type: diff > 0 ? 'IN' : 'OUT',
            quantity: Math.abs(diff),
            reason: 'Manual Adjustment',
            referenceId: b.id
          };
          setStockLedger(prev => [ledgerEntry, ...prev]);

          // Update Supabase inventory table
          const updates: any = { qty_offline: quantity };
          let newOnlineStock = b.onlineStock;
          if ((b.onlineStock || 0) > quantity) {
              updates.qty_online = quantity;
              newOnlineStock = quantity;
          }
          queueOfflineStockUpdate(b.batchNumber, updates);
          
          return { ...b, stock: quantity, onlineStock: newOnlineStock };
      }
      
      return b;
    }));
  };

  const updateBatchDiscount = (batchId: string, discount: Batch['discount']) => {
    setBatches(prev => prev.map(b => b.id === batchId ? { ...b, discount } : b));
  };

  const updateBatchOnlineStatus = (batchId: string, status: 'OFFLINE' | 'DRAFT' | 'LIVE', onlineStock?: number) => {
    setBatches(prev => prev.map(b => {
      if (b.id !== batchId) return b;
      
      // Validation: Online stock cannot exceed physical stock
      let finalOnlineStock = onlineStock !== undefined ? onlineStock : (b.onlineStock || 0);
      if (finalOnlineStock > b.stock) finalOnlineStock = b.stock;
      
      // Validation: Expired items cannot be LIVE
      if (status === 'LIVE' && new Date(b.expiryDate) < new Date()) {
        alert('Cannot make expired batch LIVE');
        return b;
      }

      // Update Supabase inventory table
      queueOfflineStockUpdate(b.batchNumber, { qty_online: finalOnlineStock });

      return { ...b, onlineStatus: status, onlineStock: finalOnlineStock };
    }));
  };

  const addOrder = (orderData: Omit<Order, 'id' | 'date'> & { date?: string }) => {
    const newOrder: Order = {
      ...orderData,
      id: generateId(),
      date: orderData.date || new Date().toISOString(),
    };
    
    // Update inventory (deduct from batches)
    const newBatches = [...batches];
    const ledgerEntries: StockLedgerEntry[] = [];

    orderData.items.forEach(item => {
      const batchIndex = newBatches.findIndex(b => b.id === item.batchId);
      if (batchIndex >= 0) {
        newBatches[batchIndex].stock -= item.quantity;
        
        // Real-time Stock Sync: If total_stock falls below online_stock_limit, reduce online stock
        let onlineStockUpdated = false;
        if ((newBatches[batchIndex].onlineStock || 0) > newBatches[batchIndex].stock) {
            newBatches[batchIndex].onlineStock = newBatches[batchIndex].stock;
            onlineStockUpdated = true;
        }

        // Record Stock Ledger Entry
        ledgerEntries.push({
          id: generateId(),
          productId: item.productId,
          batchId: item.batchId,
          date: newOrder.date,
          type: 'OUT',
          quantity: item.quantity,
          reason: 'Sale',
          referenceId: newOrder.id
        });

        // Update Supabase inventory table bucket logic
        const qtyColumn = orderData.type === 'Online' ? 'qty_online' : 'qty_offline';
        
        // Fetch current value and decrement
        supabase.from('inventory').select('qty_offline, qty_online').eq('batch_number', item.batchNumber).single()
          .then(({ data }) => {
            if (data) {
              const updates: any = {};
              if (orderData.type === 'Online') {
                 updates.qty_online = Math.max(0, data.qty_online - item.quantity);
              } else {
                 updates.qty_offline = Math.max(0, data.qty_offline - item.quantity);
                 // If offline sale causes physical stock to drop below online allocated stock
                 if ((data.qty_online || 0) > updates.qty_offline) {
                     updates.qty_online = updates.qty_offline;
                 }
              }
              queueOfflineStockUpdate(item.batchNumber, updates);
            }
          });
      }
    });
    setBatches(newBatches);
    setStockLedger(prev => [...ledgerEntries, ...prev]);

    // Save to Supabase sales table (one row per item)
    const salesData = newOrder.items.map(item => ({
      id: generateId(),
      order_id: newOrder.id,
      item_id: item.batchId, // Links to inventory table
      product_name: item.name,
      quantity: item.quantity,
      total_amount: item.finalPrice * item.quantity,
      customer_name: newOrder.customerName || 'Walk-in',
      payment_mode: newOrder.paymentMode,
      order_type: newOrder.type,
      status: newOrder.status,
      date: newOrder.date
    }));

    supabase.from('sales').insert(salesData).then(({ error }) => {
      if (error) console.error("Error saving to sales table:", error);
    });

    // Update customer balance if credit
    if (orderData.paymentMode === 'Credit' && orderData.customerId) {
        // Create Ledger Entry for Credit Sale
        addLedgerEntry({
            customerId: orderData.customerId,
            type: 'DEBIT',
            amount: orderData.total,
            description: `Credit Bill #${newOrder.id.slice(-4)}`,
            orderId: newOrder.id,
            source: orderData.type === 'Online' ? 'ONLINE' : 'OFFLINE'
        });
    }

    setOrders(prev => [newOrder, ...prev]);
  };

  const updateOrderStatus = (id: string, status: Order['status']) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== id) return o;
      
      // If status changes to 'Accepted' or 'Urgent' for an online order, deduct stock
      if (o.type === 'Online' && (status === 'Accepted' || status === 'Urgent') && (o.status === 'Pending')) {
        setBatches(prevBatches => prevBatches.map(b => {
          const item = o.items.find(i => i.batchId === b.id);
          if (item) {
            const newStock = Math.max(0, b.stock - item.quantity);
            const newOnlineStock = Math.max(0, (b.onlineStock || 0) - item.quantity);
            
            // Update Supabase inventory table
            queueOfflineStockUpdate(b.batchNumber, { 
                qty_offline: newStock,
                qty_online: newOnlineStock
            });

            return { 
                ...b, 
                stock: newStock,
                onlineStock: newOnlineStock
            };
          }
          return b;
        }));
      }

      // Update Supabase sales table
      supabase.from('sales').update({ status }).eq('order_id', id).then(({ error }) => {
        if (error) console.error("Error updating order status in sales table:", error);
      });

      return { ...o, status };
    }));
  };

  const addLedgerEntry = (entryData: Omit<LedgerEntry, 'id' | 'date'>) => {
      const newEntry: LedgerEntry = {
          ...entryData,
          id: generateId(),
          date: new Date().toISOString()
      };

      setCustomers(prev => prev.map(c => {
          if (c.id === entryData.customerId) {
              const balanceChange = entryData.type === 'DEBIT' ? entryData.amount : -entryData.amount;
              const newBalance = c.balance + balanceChange;
              
              // Update Supabase customer balance
              supabase.from('customers').update({ balance: newBalance }).eq('id', c.id).then(({ error }) => {
                if (error) console.error("Error updating customer balance from ledger:", error);
              });

              return {
                  ...c,
                  balance: newBalance,
                  ledger: [newEntry, ...(c.ledger || [])]
              };
          }
          return c;
      }));
  };

  const returnOrder = (id: string) => {
    console.log('returnOrder called with id:', id);
    const order = orders.find(o => o.id === id);
    if (!order) {
        console.error('Order not found:', id);
        return;
    }
    console.log('Order found:', order);

    // Revert Inventory
    const ledgerEntries: StockLedgerEntry[] = [];

    setBatches(prevBatches => prevBatches.map(b => {
        const item = order.items.find(i => i.batchId === b.id);
        if (item) {
            console.log(`Reverting stock for batch ${b.id}: ${b.stock} + ${item.quantity}`);
            
            // Revert Supabase inventory bucket
            const qtyColumn = order.type === 'Online' ? 'qty_online' : 'qty_offline';
            supabase.from('inventory').select(qtyColumn).eq('batch_number', item.batchNumber).single()
              .then(({ data }) => {
                if (data) {
                  const newQty = data[qtyColumn] + item.quantity;
                  supabase.from('inventory').update({ [qtyColumn]: newQty }).eq('batch_number', item.batchNumber).then(({ error }) => {
                    if (error) console.error("Error reverting inventory bucket:", error);
                  });
                }
              });

            return { ...b, stock: b.stock + item.quantity };
        }
        return b;
    }));

    order.items.forEach(item => {
        // Only add ledger entry if batch exists
        if (batches.some(b => b.id === item.batchId)) {
            ledgerEntries.push({
                id: generateId(),
                productId: item.productId,
                batchId: item.batchId,
                date: new Date().toISOString(),
                type: 'IN',
                quantity: item.quantity,
                reason: `Order Returned #${order.id.slice(-4)}`,
                referenceId: order.id
            });
        } else {
            console.warn(`Batch ${item.batchId} not found for item ${item.name}, skipping ledger entry.`);
        }
    });

    setStockLedger(prev => [...ledgerEntries, ...prev]);
    
    // Revert Customer Ledger if Credit
    if (order.paymentMode === 'Credit' && order.customerId) {
        console.log('Reverting customer ledger for credit order');
        addLedgerEntry({
            customerId: order.customerId,
            type: 'CREDIT', // Reversing the DEBIT
            amount: order.total,
            description: `Reversal: Order Returned #${order.id.slice(-4)}`,
            orderId: order.id,
            source: 'OFFLINE'
        });
    }

    // Delete from Supabase sales table
    supabase.from('sales').delete().eq('order_id', order.id).then(({ error }) => {
        if (error) console.error("Error deleting from sales table:", error);
    });

    setOrders(prev => {
        console.log('Removing order from state');
        return prev.filter(o => o.id !== id);
    });
  };

  const addCustomer = (customerData: Omit<Customer, 'id' | 'balance' | 'history' | 'ledger'>) => {
    const newCustomer: Customer = {
      ...customerData,
      id: generateId(),
      balance: 0,
      history: [],
      ledger: []
    };
    setCustomers(prev => [...prev, newCustomer]);

    // Write directly to Supabase customers table
    supabase.from('customers').insert({
      id: newCustomer.id,
      name: newCustomer.name,
      mobile: newCustomer.mobile,
      balance: newCustomer.balance
    }).then(({ error }) => {
      if (error) console.error("Error inserting into customers table:", error);
    });

    return newCustomer;
  };

  const updateCustomerBalance = (id: string, amount: number) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === id) {
        const newBalance = c.balance + amount;
        supabase.from('customers').update({ balance: newBalance }).eq('id', id).then(({ error }) => {
          if (error) console.error("Error updating customer balance:", error);
        });
        return { ...c, balance: newBalance };
      }
      return c;
    }));
  };

  const addExpense = (expenseData: Omit<Expense, 'id'>) => {
    const newExpense = { ...expenseData, id: generateId() };
    setExpenses(prev => [newExpense, ...prev]);
  };

  const addPurchaseOrder = (poData: Omit<PurchaseOrder, 'id' | 'date'>) => {
    const newPO: PurchaseOrder = {
      ...poData,
      id: generateId(),
      date: new Date().toISOString()
    };
    setPurchaseOrders(prev => [newPO, ...prev]);
  };

  const updatePurchaseOrderStatus = (id: string, status: PurchaseOrder['status']) => {
    setPurchaseOrders(prev => prev.map(po => po.id === id ? { ...po, status } : po));
  };

  const updatePurchaseOrder = (id: string, updates: Partial<PurchaseOrder>) => {
    setPurchaseOrders(prev => prev.map(po => po.id === id ? { ...po, ...updates } : po));
  };

  const addSupplier = (supplierData: Omit<Supplier, 'id'>) => {
    const newSupplier = { ...supplierData, id: generateId() };
    setSuppliers(prev => [...prev, newSupplier]);
  };

  const saveDailyLedger = (ledgerData: Omit<DailyLedgerRecord, 'id'>) => {
    const newLedger = { ...ledgerData, id: generateId() };
    setDailyLedgers(prev => {
      // Replace if same date exists, else add
      const existingIndex = prev.findIndex(l => l.date === ledgerData.date);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newLedger;
        return updated;
      }
      return [newLedger, ...prev];
    });
  };

  const updateStoreProfile = (updates: Partial<StoreProfile>) => {
    if (!store) return;
    const updatedStore = { ...store, ...updates };
    setStoreState(updatedStore);
    localStorage.setItem('umps_store', JSON.stringify(updatedStore));
  };

  const addVendorPost = (postData: Omit<VendorPost, 'id' | 'createdAt' | 'storeId'>) => {
    if (!store) return;
    const newPost: VendorPost = {
      ...postData,
      id: generateId(),
      storeId: store.id,
      createdAt: new Date().toISOString()
    };
    setVendorPosts(prev => [newPost, ...prev]);
    localStorage.setItem('umps_vendor_posts', JSON.stringify([newPost, ...vendorPosts]));
    
    // Also save to a dedicated table if it exists
    supabase.from('vendor_posts').insert({
      id: newPost.id,
      store_id: newPost.storeId,
      content: newPost.content,
      image_url: newPost.imageUrl,
      created_at: newPost.createdAt
    }).then(({ error }) => {
      if (error) console.error("Error saving to vendor_posts table:", error);
    });
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    
    // If name or subCategory changes, update inventory table
    if (updates.name || updates.subCategory) {
      const updateData: any = {};
      if (updates.name) updateData.product_name = updates.name;
      if (updates.subCategory) updateData.sub_category = updates.subCategory;
      
      const productBatches = batches.filter(b => b.productId === id);
      const batchIds = productBatches.map(b => b.id);
      
      if (batchIds.length > 0) {
        supabase.from('inventory').update(updateData).in('id', batchIds).then(({ error }) => {
          if (error) console.error("Error updating inventory table for product:", error);
        });
      }
    }
  };

  const resetStore = () => {
      localStorage.clear();
      setStoreState(null);
      setProducts([]);
      setBatches([]);
      setOrders([]);
      setCustomers([]);
      setExpenses([]);
      setStockLedger([]);
      setPurchaseOrders([]);
      setSuppliers([]);
  }

  return (
    <StoreContext.Provider value={{
      store, setStore,
      products, batches, addProduct, addBatch, updateBatchStock, updateBatchDiscount, updateBatchOnlineStatus,
      orders, addOrder, updateOrderStatus, returnOrder,
      stockLedger, purchaseOrders, addPurchaseOrder, updatePurchaseOrderStatus, updatePurchaseOrder,
      suppliers, addSupplier,
      customers, addCustomer, updateCustomerBalance, addLedgerEntry,
      expenses, addExpense,
      dailyLedgers, saveDailyLedger,
      vendorPosts, addVendorPost, updateStoreProfile,
      updateProduct,
      resetStore,
      syncStatus
    }}>
      {children}
    </StoreContext.Provider>
  );
};
