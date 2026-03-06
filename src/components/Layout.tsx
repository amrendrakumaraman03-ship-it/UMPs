import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Menu, Bell, User, Globe, Cloud, CloudOff, RefreshCw, X, Keyboard, Layout as LayoutIcon } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { cn } from '../utils';

export default function Layout() {
  const { store, syncStatus } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      const isTyping = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName);
      
      if (e.key === '?' && e.shiftKey && !isTyping) {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }

      if (e.key === 'Escape') {
        setShowShortcuts(false);
        // Also clear search if on a page with search
        const searchInput = document.querySelector('input[type="text"], input[placeholder*="Search"]') as HTMLInputElement;
        if (searchInput && document.activeElement === searchInput) {
          searchInput.value = '';
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          searchInput.blur();
        }
      }

      if (!isTyping) {
        if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          const searchInput = document.querySelector('input[type="text"], input[placeholder*="Search"]') as HTMLInputElement;
          if (searchInput) searchInput.focus();
        }

        if (e.key.toLowerCase() === 'a') {
          e.preventDefault();
          if (location.pathname === '/inventory') {
            const addBtn = document.querySelector('button:contains("Add"), button:contains("New")') as HTMLButtonElement;
            if (addBtn) addBtn.click();
            else navigate('/inventory?new=true');
          } else if (location.pathname === '/invoice-upload') {
             // Already on upload page
          } else {
            navigate('/inventory?new=true');
          }
        }

        if (e.key.toLowerCase() === 'p') {
          e.preventDefault();
          navigate('/pos');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, location.pathname]);

  // If no store, redirect to onboarding (handled in App.tsx usually, but safe check here)
  React.useEffect(() => {
    if (!store && location.pathname !== '/onboarding') {
      navigate('/onboarding');
    }
  }, [store, navigate, location.pathname]);

  if (!store) return <Outlet />;

  const navItems = [
    { to: "/", icon: <LayoutDashboard size={22} />, label: "Home", tooltip: "Dashboard (H)" },
    { to: "/pos", icon: <ShoppingCart size={24} />, label: "POS", tooltip: "Point of Sale (P)", isSpecial: true },
    { to: "/inventory", icon: <Package size={22} />, label: "Items", tooltip: "Inventory (I)" },
    { to: "/online-store", icon: <Globe size={22} />, label: "Online", tooltip: "Online Store (O)" },
    { to: "/storefront-designer", icon: <LayoutIcon size={22} />, label: "Designer", tooltip: "Storefront Designer (D)" },
    { to: "/orders", icon: <Menu size={22} />, label: "Orders", tooltip: "Menu (M)" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 sticky top-0 h-screen z-30">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-100">
              U
            </div>
            <div>
              <h1 className="font-bold text-gray-900 leading-tight truncate">
                {store.name}
              </h1>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">{store.type}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                  isActive 
                    ? "bg-blue-50 text-blue-600 shadow-sm" 
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                )
              }
            >
              <div className={cn("transition-transform group-hover:scale-110", item.isSpecial && "text-blue-600")}>
                {item.icon}
              </div>
              <span className="font-medium">{item.label}</span>
              {item.isSpecial && (
                <span className="ml-auto text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">NEW</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-2">
          <button 
            onClick={() => setShowShortcuts(true)}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-all"
          >
            <Keyboard size={20} />
            <span className="text-sm font-medium">Shortcuts</span>
            <span className="ml-auto text-[10px] text-gray-400">?</span>
          </button>
          <button 
            onClick={() => navigate('/settings')}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-all"
          >
            <User size={20} />
            <span className="text-sm font-medium">Settings</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header (Mobile Only or Desktop Top Bar) */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 lg:z-20">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                U
              </div>
              <div>
                <h1 className="font-semibold text-gray-900 leading-tight truncate max-w-[150px] sm:max-w-xs">
                  {store.name}
                </h1>
              </div>
            </div>
            
            <div className="hidden lg:block">
              <p className="text-sm font-medium text-gray-500">
                {location.pathname === '/' ? 'Dashboard' : 
                 location.pathname === '/pos' ? 'Point of Sale' :
                 location.pathname === '/inventory' ? 'Inventory Management' :
                 location.pathname === '/online-store' ? 'Online Store' :
                 location.pathname === '/storefront-designer' ? 'Storefront Designer' :
                 location.pathname === '/orders' ? 'Order History' : 'Management'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center mr-1" title={syncStatus === 'synced' ? 'Cloud Synced' : syncStatus === 'syncing' ? 'Syncing...' : 'Sync Error'}>
                {syncStatus === 'synced' && <Cloud size={18} className="text-green-500" />}
                {syncStatus === 'syncing' && <RefreshCw size={18} className="text-blue-500 animate-spin" />}
                {syncStatus === 'error' && <CloudOff size={18} className="text-red-500" />}
              </div>
              <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full relative">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full lg:hidden" onClick={() => navigate('/settings')}>
                <User size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div className="max-w-7xl mx-auto p-4 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-20 lg:hidden">
        <div className="flex justify-around items-center h-16 max-w-7xl mx-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              title={item.tooltip}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center w-full h-full gap-1 group relative",
                  isActive ? "text-blue-600" : "text-gray-500"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {item.isSpecial ? (
                    <>
                      <div className={cn("p-3 rounded-full -mt-6 shadow-lg border-4 border-gray-50 transition-transform group-hover:scale-110", isActive ? "bg-blue-600 text-white" : "bg-blue-600 text-white")}>
                        {item.icon}
                      </div>
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </>
                  ) : (
                    <>
                      <div className="transition-transform group-hover:scale-110">
                        {item.icon}
                      </div>
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </>
                  )}
                  {/* Desktop Tooltip */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap hidden lg:block z-30">
                    {item.tooltip}
                  </div>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Shortcut Guide Overlay */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowShortcuts(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Keyboard size={20} />
                <h3 className="font-bold">Keyboard Shortcuts</h3>
              </div>
              <button onClick={() => setShowShortcuts(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Focus Search</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-bold">S</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Add New Item</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-bold">A</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Point of Sale</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-bold">P</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Close / Clear</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-bold">Esc</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Show this guide</span>
                <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-bold">Shift + ?</kbd>
              </div>
            </div>
            <div className="bg-gray-50 p-4 text-center text-xs text-gray-400 border-t border-gray-100">
              UMPs Desktop Experience
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
