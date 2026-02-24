import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Receipt, BarChart3, Settings, LogOut, ChevronRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export default function Menu() {
  const navigate = useNavigate();
  const { resetStore } = useStore();

  const menuItems = [
    { icon: <Users size={20} />, label: 'Customers', path: '/customers', color: 'text-purple-600 bg-purple-50' },
    { icon: <Receipt size={20} />, label: 'Expenses', path: '/expenses', color: 'text-pink-600 bg-pink-50' },
    { icon: <BarChart3 size={20} />, label: 'Reports', path: '/reports', color: 'text-teal-600 bg-teal-50' },
    { icon: <Settings size={20} />, label: 'Settings', path: '/settings', color: 'text-gray-600 bg-gray-50' },
  ];

  const handleLogout = () => {
    if (confirm("Are you sure you want to reset all data?")) {
      resetStore();
      navigate('/onboarding');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Menu</h2>

      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.color}`}>
                {item.icon}
              </div>
              <span className="font-medium text-gray-900">{item.label}</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>
        ))}
      </div>

      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 p-4 text-red-600 font-medium hover:bg-red-50 rounded-xl transition-colors mt-8"
      >
        <LogOut size={20} />
        Reset App Data
      </button>
      
      <div className="text-center mt-8 text-xs text-gray-400">
        <p>UMPs Vendor Console v1.0.0</p>
      </div>
    </div>
  );
}
