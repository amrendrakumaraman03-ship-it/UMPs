import React, { createContext, useContext, useState, useEffect } from 'react';
import { StoreProfile, Product, Batch, Order, Customer, Expense, LedgerEntry } from '../types';
import { generateId } from '../utils';

interface StoreContextType {
  store: StoreProfile | null;
  setStore: (store: StoreProfile) => void;
  
  products: Product[];
  batches: Batch[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  addBatch: (batch: Omit<Batch, 'id'>) => void;
  updateBatchStock: (batchId: string, quantity: number) => void;
  updateBatchDiscount: (batchId: string, discount: Batch['discount']) => void;
  updateBatchOnlineStatus: (batchId: string, status: 'OFFLINE' | 'DRAFT' | 'LIVE', onlineStock?: number) => void;
  
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'date'> & { date?: string }) => void;
  updateOrderStatus: (id: string, status: Order['status']) => void;
  
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'balance' | 'history' | 'ledger'>) => Customer;
  updateCustomerBalance: (id: string, amount: number) => void;
  addLedgerEntry: (entry: Omit<LedgerEntry, 'id' | 'date'>) => void;
  
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  
  resetStore: () => void;
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

  // Persistence
  useEffect(() => {
    if (store) localStorage.setItem('umps_store', JSON.stringify(store));
    else localStorage.removeItem('umps_store');
  }, [store]);

  useEffect(() => { localStorage.setItem('umps_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('umps_batches', JSON.stringify(batches)); }, [batches]);
  useEffect(() => { localStorage.setItem('umps_orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem('umps_customers', JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem('umps_expenses', JSON.stringify(expenses)); }, [expenses]);

  // Actions
  const setStore = (data: StoreProfile) => setStoreState(data);

  const addProduct = (productData: Omit<Product, 'id'>) => {
    const newProduct = { ...productData, id: generateId() };
    setProducts(prev => [...prev, newProduct]);
    return newProduct;
  };

  const addBatch = (batchData: Omit<Batch, 'id'>) => {
    const newBatch = { ...batchData, id: generateId() };
    setBatches(prev => [...prev, newBatch]);
  };

  const updateBatchStock = (batchId: string, quantity: number) => {
    setBatches(prev => prev.map(b => b.id === batchId ? { ...b, stock: quantity } : b));
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
    orderData.items.forEach(item => {
      const batchIndex = newBatches.findIndex(b => b.id === item.batchId);
      if (batchIndex >= 0) {
        newBatches[batchIndex].stock -= item.quantity;
      }
    });
    setBatches(newBatches);

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
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
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
    return newCustomer;
  };

  const updateCustomerBalance = (id: string, amount: number) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, balance: c.balance + amount } : c));
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
              return {
                  ...c,
                  balance: c.balance + balanceChange,
                  ledger: [newEntry, ...(c.ledger || [])]
              };
          }
          return c;
      }));
  };

  const addExpense = (expenseData: Omit<Expense, 'id'>) => {
    const newExpense = { ...expenseData, id: generateId() };
    setExpenses(prev => [newExpense, ...prev]);
  };

  const resetStore = () => {
      localStorage.clear();
      setStoreState(null);
      setProducts([]);
      setBatches([]);
      setOrders([]);
      setCustomers([]);
      setExpenses([]);
  }

  return (
    <StoreContext.Provider value={{
      store, setStore,
      products, batches, addProduct, addBatch, updateBatchStock, updateBatchDiscount, updateBatchOnlineStatus,
      orders, addOrder, updateOrderStatus,
      customers, addCustomer, updateCustomerBalance, addLedgerEntry,
      expenses, addExpense,
      resetStore
    }}>
      {children}
    </StoreContext.Provider>
  );
};
