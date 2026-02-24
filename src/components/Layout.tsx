import React from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Menu, Bell, User, Globe } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { cn } from '../utils';

export default function Layout() {
  const { store } = useStore();
  const location = useLocation();
  const navigate = useNavigate();

  // If no store, redirect to onboarding (handled in App.tsx usually, but safe check here)
  React.useEffect(() => {
    if (!store && location.pathname !== '/onboarding') {
      navigate('/onboarding');
    }
  }, [store, navigate, location.pathname]);

  if (!store) return <Outlet />;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              U
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 leading-tight truncate max-w-[150px] sm:max-w-xs">
                {store.name}
              </h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">{store.type}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
              <Bell size={20} />
            </button>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full" onClick={() => navigate('/settings')}>
              <User size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-7xl mx-auto p-4">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation (Mobile First) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-20">
        <div className="flex justify-around items-center h-16 max-w-7xl mx-auto">
          <NavLink
            to="/"
            className={({ isActive }) =>
              cn("flex flex-col items-center justify-center w-full h-full gap-1", isActive ? "text-blue-600" : "text-gray-500")
            }
          >
            <LayoutDashboard size={22} />
            <span className="text-[10px] font-medium">Home</span>
          </NavLink>
          
          <NavLink
            to="/pos"
            className={({ isActive }) =>
              cn("flex flex-col items-center justify-center w-full h-full gap-1", isActive ? "text-blue-600" : "text-gray-500")
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn("p-3 rounded-full -mt-6 shadow-lg border-4 border-gray-50", isActive ? "bg-blue-600 text-white" : "bg-blue-600 text-white")}>
                  <ShoppingCart size={24} />
                </div>
                <span className="text-[10px] font-medium">POS</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/inventory"
            className={({ isActive }) =>
              cn("flex flex-col items-center justify-center w-full h-full gap-1", isActive ? "text-blue-600" : "text-gray-500")
            }
          >
            <Package size={22} />
            <span className="text-[10px] font-medium">Items</span>
          </NavLink>

          <NavLink
            to="/online-store"
            className={({ isActive }) =>
              cn("flex flex-col items-center justify-center w-full h-full gap-1", isActive ? "text-blue-600" : "text-gray-500")
            }
          >
            <Globe size={22} />
            <span className="text-[10px] font-medium">Online</span>
          </NavLink>

          <NavLink
            to="/orders"
            className={({ isActive }) =>
              cn("flex flex-col items-center justify-center w-full h-full gap-1", isActive ? "text-blue-600" : "text-gray-500")
            }
          >
            <Menu size={22} />
            <span className="text-[10px] font-medium">Orders</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
