import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Card, Button, Input } from '../components/ui';
import { formatCurrency } from '../utils';
import { Plus, TrendingDown } from 'lucide-react';

export default function Expenses() {
  const { expenses, addExpense } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'Other',
    amount: '',
    note: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) return;

    addExpense({
      type: formData.type as any,
      amount: Number(formData.amount),
      date: new Date().toISOString(),
      note: formData.note,
    });
    setFormData({ type: 'Other', amount: '', note: '' });
    setShowForm(false);
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Expenses</h2>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus size={16} className="mr-1" /> Add Expense
        </Button>
      </div>

      <Card className="p-4 bg-pink-50 border-pink-100">
        <div className="flex items-center gap-2 text-pink-700 mb-1">
          <TrendingDown size={16} />
          <span className="text-xs font-semibold uppercase">Total Expenses</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
      </Card>

      {showForm && (
        <Card className="p-4 animate-in slide-in-from-top-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select 
                  className="w-full h-10 rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                >
                  <option>Rent</option>
                  <option>Salary</option>
                  <option>Electricity</option>
                  <option>Inventory</option>
                  <option>Other</option>
                </select>
              </div>
              <Input 
                label="Amount" 
                type="number" 
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
            <Input 
              label="Note" 
              value={formData.note}
              onChange={e => setFormData({ ...formData, note: e.target.value })}
            />
            <div className="flex gap-2">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" className="flex-1">Save</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-2">
        {expenses.map(expense => (
          <Card key={expense.id} className="p-3 flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-900">{expense.type}</p>
              <p className="text-xs text-gray-500">{new Date(expense.date).toLocaleDateString()} • {expense.note}</p>
            </div>
            <p className="font-bold text-gray-900">-{formatCurrency(expense.amount)}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
