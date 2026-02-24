import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { Button, Input, Card } from '../components/ui';
import { Store, ShoppingBag, Stethoscope, Zap, Briefcase, Plus } from 'lucide-react';
import { BusinessType } from '../types';

const businessTypes: { type: BusinessType; icon: React.ReactNode; label: string }[] = [
  { type: 'Pharmacy', icon: <Stethoscope size={24} />, label: 'Pharmacy' },
  { type: 'Electronics', icon: <Zap size={24} />, label: 'Electronics' },
  { type: 'Grocery', icon: <ShoppingBag size={24} />, label: 'Grocery' },
  { type: 'Services', icon: <Briefcase size={24} />, label: 'Services' },
  { type: 'Hospital', icon: <Plus size={24} />, label: 'Hospital' },
  { type: 'Other', icon: <Store size={24} />, label: 'Other' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { setStore } = useStore();
  const [formData, setFormData] = useState({
    name: '',
    type: '' as BusinessType | '',
    address: '',
    pincode: '',
    phone: '',
    gst: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.type || !formData.phone) return;

    setStore({
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name,
      type: formData.type as BusinessType,
      address: formData.address,
      pincode: formData.pincode,
      phone: formData.phone,
      gst: formData.gst,
      onlineOrdersEnabled: true,
      deliveryEnabled: false,
    });

    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-lg shadow-blue-200">
            U
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to UMPs</h1>
          <p className="text-gray-500 mt-2">Set up your business in 1 minute</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Business Name"
              placeholder="e.g. City Pharmacy"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Type</label>
              <div className="grid grid-cols-3 gap-2">
                {businessTypes.map((b) => (
                  <button
                    key={b.type}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: b.type })}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                      formData.type === b.type
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <div className="mb-1">{b.icon}</div>
                    <span className="text-[10px] font-medium">{b.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Phone Number"
              type="tel"
              placeholder="9876543210"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Pincode"
                placeholder="110001"
                value={formData.pincode}
                onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                required
              />
              <Input
                label="GST (Optional)"
                placeholder="GSTIN..."
                value={formData.gst}
                onChange={e => setFormData({ ...formData, gst: e.target.value })}
              />
            </div>

            <Input
              label="Address"
              placeholder="Shop No, Street, Area"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              required
            />

            <Button type="submit" className="w-full mt-6" size="lg" disabled={!formData.name || !formData.type || !formData.phone}>
              Create Store
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
