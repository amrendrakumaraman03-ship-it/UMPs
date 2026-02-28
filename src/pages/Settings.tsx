import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Card, Button, Input } from '../components/ui';
import { LogOut, Database, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Settings() {
  const { store, setStore, resetStore } = useStore();
  const navigate = useNavigate();
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setDbStatus('checking');
    try {
      // Simple health check query
      const { error } = await supabase.from('pg_stat_activity').select('pid').limit(1);
      // Supabase might restrict pg_stat_activity, so let's just check if we can get the session or ping
      // Actually, a safer ping is to just check auth session or a non-existent table and see if it returns a network error vs a PGRST error
      const { error: pingError } = await supabase.from('non_existent_table_ping').select('*').limit(1);
      
      // If error is PGRST116 or similar, it means it reached the DB successfully but table doesn't exist
      if (pingError && pingError.code !== 'FETCH_ERROR') {
         setDbStatus('connected');
      } else if (pingError && pingError.code === 'FETCH_ERROR') {
         setDbStatus('error');
      } else {
         setDbStatus('connected');
      }
    } catch (e) {
      setDbStatus('error');
    }
  };

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

      <Card className="p-4 space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Database size={18} className="text-blue-600" />
            Cloud Database
          </h3>
          <button onClick={checkConnection} className="text-gray-400 hover:text-blue-600">
            <RefreshCw size={16} className={dbStatus === 'checking' ? 'animate-spin' : ''} />
          </button>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="flex items-center gap-3">
            {dbStatus === 'checking' && <RefreshCw size={20} className="text-blue-500 animate-spin" />}
            {dbStatus === 'connected' && <CheckCircle size={20} className="text-green-500" />}
            {dbStatus === 'error' && <XCircle size={20} className="text-red-500" />}
            
            <div>
              <p className="text-sm font-medium text-gray-900">Supabase Connection</p>
              <p className="text-xs text-gray-500">
                {dbStatus === 'checking' && 'Verifying connection...'}
                {dbStatus === 'connected' && 'Connected successfully'}
                {dbStatus === 'error' && 'Connection failed'}
              </p>
            </div>
          </div>
          {dbStatus === 'connected' && (
            <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase tracking-wider">
              Active
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          Your app is connected to the Supabase project. To fully migrate your local data to the cloud, you will need to create the corresponding tables in your Supabase SQL Editor.
        </p>
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
