export type BusinessType = 'Pharmacy' | 'Electronics' | 'Grocery' | 'Services' | 'Hospital' | 'Other';

export interface StoreProfile {
  id: string;
  name: string;
  type: BusinessType;
  address: string;
  pincode: string;
  gst?: string;
  phone: string;
  timings?: string;
  onlineOrdersEnabled: boolean;
  deliveryEnabled: boolean;
}

// Master Product Definition
export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  gstRate: number;
  minStockAlert: number;
}

// Inventory Batch
export interface Batch {
  id: string;
  productId: string;
  batchNumber: string;
  manufacturingDate?: string;
  expiryDate: string;
  purchaseRate: number;
  mrp: number; // Selling Price
  stock: number;
  discount?: {
    type: 'PERCENTAGE' | 'FLAT';
    value: number;
    enabled: boolean;
  };
  // Online Inventory Management
  onlineStock?: number;
  onlineStatus?: 'OFFLINE' | 'DRAFT' | 'LIVE';
}

export type PaymentMode = 'Cash' | 'UPI' | 'Card' | 'Credit';

export interface CartItem {
  productId: string;
  batchId: string;
  name: string;
  batchNumber: string;
  expiryDate: string;
  mrp: number;
  quantity: number;
  gstRate: number;
  discount?: number; // Total discount amount for this line item
  finalPrice: number; // Unit price after discount
}

export interface Order {
  id: string;
  customerName?: string;
  customerId?: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMode: PaymentMode;
  status: 'Pending' | 'Accepted' | 'Packed' | 'Out for Delivery' | 'Delivered' | 'Completed' | 'Cancelled';
  type: 'Online' | 'Offline';
  date: string;
}

export interface LedgerEntry {
  id: string;
  customerId: string;
  date: string;
  type: 'DEBIT' | 'CREDIT'; // DEBIT = Customer owes money (Credit Sale), CREDIT = Customer paid money
  amount: number;
  description: string;
  orderId?: string; // Linked order if applicable
  source: 'OFFLINE' | 'ONLINE' | 'MANUAL';
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  balance: number; // Positive = Customer owes money (Receivable)
  history: string[];
  ledger: LedgerEntry[];
}

export interface Expense {
  id: string;
  type: 'Rent' | 'Salary' | 'Electricity' | 'Inventory' | 'Other';
  amount: number;
  date: string;
  note?: string;
}
