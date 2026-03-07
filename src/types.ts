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
  // Storefront Designer Fields
  logoUrl?: string;
  bannerUrl?: string;
  bio?: string;
  facilities?: string[];
  primaryColor?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface VendorPost {
  id: string;
  storeId: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
}

// Master Product Definition
export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  subCategory?: string;
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
  bookedStock?: number; // Stock reserved for online orders
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
  status: 'Pending' | 'Accepted' | 'Packed' | 'Out for Delivery' | 'Delivered' | 'Completed' | 'Cancelled' | 'Urgent';
  type: 'Online' | 'Offline';
  date: string;
}

export interface StockLedgerEntry {
  id: string;
  productId: string;
  batchId: string;
  date: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reason: string; // e.g., 'Purchase', 'Sale', 'Return', 'Audit'
  referenceId?: string; // e.g., orderId or purchaseOrderId
}

export interface Supplier {
  id: string;
  name: string;
  details: string; // Address, GST, etc.
  contact?: string;
}

export interface PurchaseOrder {
  id: string;
  date: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    expectedRate?: number;
  }[];
  status: 'Draft' | 'Sent' | 'Received' | 'Cancelled';
  supplierId?: string;
  supplierName?: string;
  supplierDetails?: string;
  vendorDetails?: string;
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

export interface DailyLedgerRecord {
  id: string;
  date: string;
  openingBalance: number;
  grossSales: number;
  onlineSales: number;
  creditSales: number;
  expenses: number;
  actualCash: number;
  bankDeposit: number;
  expectedCash: number;
  difference: number;
  closingBalance: number;
}
