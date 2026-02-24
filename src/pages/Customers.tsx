import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Card, Button, Input } from '../components/ui';
import { formatCurrency } from '../utils';
import { User, Phone, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function Customers() {
  const { customers, updateCustomerBalance } = useStore();
  const [search, setSearch] = useState('');

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.mobile.includes(search)
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Customers</h2>

      <Input 
        placeholder="Search by name or phone..." 
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="space-y-3">
        {filteredCustomers.map(customer => (
          <Card key={customer.id} className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{customer.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Phone size={12} />
                    <span>{customer.mobile}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Balance</p>
                <p className={`font-bold ${customer.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(Math.abs(customer.balance))}
                  <span className="text-xs font-normal text-gray-500 ml-1">
                    {customer.balance > 0 ? 'Due' : 'Adv'}
                  </span>
                </p>
              </div>
            </div>

            {customer.balance > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="flex-1"
                  onClick={() => {
                      const amount = prompt('Enter payment amount received:');
                      if (amount && !isNaN(Number(amount))) {
                          updateCustomerBalance(customer.id, -Number(amount));
                      }
                  }}
                >
                  Record Payment
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                      // Logic to send reminder (mock)
                      alert(`Reminder sent to ${customer.mobile}`);
                  }}
                >
                  Send Reminder
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
