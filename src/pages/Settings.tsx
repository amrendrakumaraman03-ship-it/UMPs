import React from 'react';
import { useStore } from '../context/StoreContext';
import { Card, Button, Input } from '../components/ui';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { store, setStore, resetStore } = useStore();
  const navigate = useNavigate();

  if (!store) return null;

  const handleLogout = () => {
      if(confirm("Are you sure you want to reset all data? This cannot be undone.")) {
          resetStore();
          navigate('/onboarding');
      }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Settings</h2>

      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-gray-900 border-b pb-2">Store Profile</h3>
        <div className="grid grid-cols-1 gap-4">
          <Input 
            label="Store Name" 
            value={store.name} 
            onChange={e => setStore({ ...store, name: e.target.value })} 
          />
          <Input 
            label="Phone" 
            value={store.phone} 
            onChange={e => setStore({ ...store, phone: e.target.value })} 
          />
          <Input 
            label="Address" 
            value={store.address} 
            onChange={e => setStore({ ...store, address: e.target.value })} 
          />
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-gray-900 border-b pb-2">Preferences</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Online Orders</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={store.onlineOrdersEnabled}
              onChange={e => setStore({ ...store, onlineOrdersEnabled: e.target.checked })}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Delivery Service</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={store.deliveryEnabled}
              onChange={e => setStore({ ...store, deliveryEnabled: e.target.checked })}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </Card>

      <Button variant="danger" className="w-full" onClick={handleLogout}>
        <LogOut size={18} className="mr-2" /> Reset App Data
      </Button>
      
      <p className="text-center text-xs text-gray-400">
          Version 1.0.0 • Local Storage Mode
      </p>
    </div>
  );
}
