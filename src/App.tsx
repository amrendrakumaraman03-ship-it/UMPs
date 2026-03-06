import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import Layout from './components/Layout';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ExpiryDiscount from './pages/ExpiryDiscount';
import InvoiceUpload from './pages/InvoiceUpload';
import OnlineStore from './pages/OnlineStore';
import Khata from './pages/Khata';
import DailyLedger from './pages/DailyLedger';
import StorefrontDesigner from './pages/StorefrontDesigner';

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="pos" element={<POS />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="orders" element={<Orders />} />
            <Route path="customers" element={<Customers />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="expiry-discount" element={<ExpiryDiscount />} />
            <Route path="invoice-upload" element={<InvoiceUpload />} />
            <Route path="online-store" element={<OnlineStore />} />
            <Route path="storefront-designer" element={<StorefrontDesigner />} />
            <Route path="khata" element={<Khata />} />
            <Route path="daily-ledger" element={<DailyLedger />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}
