import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Card, Button, Input, Badge } from '../components/ui';
import { formatCurrency } from '../utils';
import { ArrowLeft, Search, Plus, ArrowDownLeft, ArrowUpRight, History, User, Phone, Wallet, Banknote, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Customer, LedgerEntry } from '../types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function Khata() {
  const { customers, addLedgerEntry } = useStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  
  // Global Action State
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [transactionType, setTransactionType] = useState<'CREDIT' | 'DEBIT' | null>(null);

  const selectedCustomer = selectedCustomerId ? customers.find(c => c.id === selectedCustomerId) || null : null;

  // Filter customers with outstanding balance or matching search
  const filteredCustomers = customers.filter(c => 
    (c.name.toLowerCase().includes(search.toLowerCase()) || c.mobile.includes(search)) &&
    (search ? true : c.balance !== 0) // Show all if searching, otherwise only those with balance
  ).sort((a, b) => b.balance - a.balance);

  const totalReceivable = customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);
  
  // Calculate recovery rate (mock logic for now, or based on recent credits)
  // Real logic: (Total Credits - Outstanding) / Total Credits
  const totalCredits = customers.reduce((sum, c) => {
      const creditEntries = c.ledger?.filter(l => l.type === 'DEBIT') || [];
      return sum + creditEntries.reduce((s, l) => s + l.amount, 0);
  }, 0);
  
  const recoveryRate = totalCredits > 0 ? ((totalCredits - totalReceivable) / totalCredits) * 100 : 0;

  // Chart Data Preparation
  const chartData = [
      { name: 'Week 1', credit: 4000, received: 2400 },
      { name: 'Week 2', credit: 3000, received: 1398 },
      { name: 'Week 3', credit: 2000, received: 9800 },
      { name: 'Week 4', credit: 2780, received: 3908 },
  ];

  const handleGlobalAction = (type: 'CREDIT' | 'DEBIT') => {
      setTransactionType(type);
      setShowCustomerSelect(true);
  };

  const handleCustomerSelect = (customer: Customer) => {
      setSelectedCustomerId(customer.id);
      setShowCustomerSelect(false);
      // Small timeout to allow state to update before showing modal
      setTimeout(() => {
          if (transactionType === 'CREDIT') setShowPaymentModal(true);
          else setShowCreditModal(true);
      }, 100);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button onClick={() => selectedCustomer ? setSelectedCustomerId(null) : navigate('/')} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <div>
            <h2 className="text-xl font-bold text-gray-900">
                {selectedCustomer ? selectedCustomer.name : 'Khata (Credit Ledger)'}
            </h2>
            {!selectedCustomer && <p className="text-xs text-gray-500">Track customer credit and payments</p>}
        </div>
      </div>

      {!selectedCustomer ? (
        <>
          {/* Quick Actions */}
          <div className="flex gap-3">
            <Button 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12 shadow-sm"
                onClick={() => handleGlobalAction('CREDIT')}
            >
                <Banknote className="mr-2" size={20} /> Receive Payment
            </Button>
            <Button 
                className="flex-1 bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 h-12 shadow-sm"
                onClick={() => handleGlobalAction('DEBIT')}
            >
                <Plus className="mr-2" size={20} /> Manual Credit
            </Button>
          </div>

          {/* Credit Overview Chart */}
          <Card className="p-4">
              <h3 className="font-bold text-gray-900 mb-4">Credit Overview</h3>
              <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9CA3AF'}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9CA3AF'}} />
                          <Tooltip />
                          <Line type="monotone" dataKey="credit" stroke="#EF4444" strokeWidth={2} dot={false} name="Credit Given" />
                          <Line type="monotone" dataKey="received" stroke="#10B981" strokeWidth={2} dot={false} name="Credit Received" />
                      </LineChart>
                  </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-2 text-xs">
                  <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-gray-500">Credit Given</span>
                  </div>
                  <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-gray-500">Credit Received</span>
                  </div>
              </div>
          </Card>

          {/* Recovery Rate Card */}
          <Card className="p-4">
              <h3 className="font-bold text-gray-900 mb-2">Recovery Rate</h3>
              <div className="text-center py-2">
                  <h1 className="text-4xl font-bold text-red-600">{recoveryRate.toFixed(1)}%</h1>
                  <p className="text-xs text-gray-500 mt-1">₹0.00 / ₹0.00</p>
              </div>
          </Card>

          {/* Debtors List Header */}
          <h3 className="font-bold text-gray-900 pt-2">Debtors</h3>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Search customers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Customer List */}
          <div className="space-y-2">
            {filteredCustomers.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                    <User className="mx-auto mb-2 opacity-20" size={48} />
                    <p>No customers found.</p>
                </div>
            ) : (
                filteredCustomers.map(customer => (
                <Card 
                    key={customer.id} 
                    className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedCustomerId(customer.id)}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                            {customer.name.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">{customer.name}</h3>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Phone size={10} /> {customer.mobile}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className={`font-bold ${customer.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(Math.abs(customer.balance))}
                        </p>
                        <p className="text-xs text-gray-500">
                            {customer.balance > 0 ? 'Due' : 'Advance'}
                        </p>
                    </div>
                </Card>
                ))
            )}
          </div>
        </>
      ) : (
        // Customer Ledger View
        <div className="space-y-4">
            <Card className="p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <p className="text-sm text-gray-500">Current Balance</p>
                        <h1 className={`text-3xl font-bold ${selectedCustomer.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(Math.abs(selectedCustomer.balance))}
                        </h1>
                        <p className="text-xs text-gray-500">{selectedCustomer.balance > 0 ? 'You will receive' : 'Advance Amount'}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowPaymentModal(true)}>
                            Receive Payment
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setShowCreditModal(true)}>
                            Add Credit
                        </Button>
                    </div>
                </div>
            </Card>

            <h3 className="font-bold text-gray-900">Transaction History</h3>
            <div className="space-y-3">
                {(selectedCustomer.ledger || []).length === 0 ? (
                    <p className="text-center text-gray-500 py-4">No transactions yet.</p>
                ) : (
                    (selectedCustomer.ledger || []).map((entry) => (
                        <Card key={entry.id} className="p-3">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3">
                                    <div className={`mt-1 p-1.5 rounded-full ${entry.type === 'DEBIT' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                        {entry.type === 'DEBIT' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{entry.description}</p>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                            <span>{new Date(entry.date).toLocaleDateString()}</span>
                                            <Badge variant="default" className="text-[10px] h-4 px-1">{entry.source}</Badge>
                                        </div>
                                    </div>
                                </div>
                                <span className={`font-bold ${entry.type === 'DEBIT' ? 'text-red-600' : 'text-green-600'}`}>
                                    {entry.type === 'DEBIT' ? '+' : '-'}{formatCurrency(entry.amount)}
                                </span>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedCustomer && (
          <TransactionModal 
            title="Receive Payment"
            type="CREDIT"
            customer={selectedCustomer}
            onClose={() => setShowPaymentModal(false)}
            onSubmit={(amount, desc) => {
                addLedgerEntry({
                    customerId: selectedCustomer.id,
                    type: 'CREDIT',
                    amount: amount,
                    description: desc || 'Payment Received',
                    source: 'MANUAL'
                });
                alert("Payment Recorded Successfully!");
                setShowPaymentModal(false);
            }}
          />
      )}

      {/* Credit Modal */}
      {showCreditModal && selectedCustomer && (
          <TransactionModal 
            title="Give Credit (Udhaar)"
            type="DEBIT"
            customer={selectedCustomer}
            onClose={() => setShowCreditModal(false)}
            onSubmit={(amount, desc) => {
                addLedgerEntry({
                    customerId: selectedCustomer.id,
                    type: 'DEBIT',
                    amount: amount,
                    description: desc || 'Manual Credit',
                    source: 'MANUAL'
                });
                alert("Credit Added Successfully!");
                setShowCreditModal(false);
            }}
          />
      )}

      {/* Customer Select Modal */}
      {showCustomerSelect && (
          <CustomerSelectModal 
            customers={customers}
            onSelect={handleCustomerSelect}
            onClose={() => setShowCustomerSelect(false)}
          />
      )}
    </div>
  );
}

function CustomerSelectModal({ customers, onSelect, onClose }: { 
    customers: Customer[], 
    onSelect: (c: Customer) => void, 
    onClose: () => void 
}) {
    const [search, setSearch] = useState('');
    const filtered = customers.filter(c => 
        c.name.toLowerCase().includes(search.toLowerCase()) || 
        c.mobile.includes(search)
    );

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl p-6 h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Select Customer</h3>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="Search by name or mobile..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="flex-1 overflow-y-auto space-y-2">
                    {filtered.map(c => (
                        <div 
                            key={c.id} 
                            className="p-3 border border-gray-100 rounded-lg flex justify-between items-center hover:bg-gray-50 cursor-pointer"
                            onClick={() => onSelect(c)}
                        >
                            <div>
                                <p className="font-bold text-gray-900">{c.name}</p>
                                <p className="text-xs text-gray-500">{c.mobile}</p>
                            </div>
                            <div className="text-right">
                                <p className={`font-bold ${c.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {formatCurrency(Math.abs(c.balance))}
                                </p>
                                <p className="text-[10px] text-gray-400">{c.balance > 0 ? 'Due' : 'Adv'}</p>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <p className="text-center text-gray-500 mt-10">No customers found</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function TransactionModal({ title, type, customer, onClose, onSubmit }: { 
    title: string, 
    type: 'CREDIT' | 'DEBIT', 
    customer: Customer, 
    onClose: () => void, 
    onSubmit: (amount: number, desc: string) => void 
}) {
    const [amount, setAmount] = useState('');
    const [desc, setDesc] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const val = Number(amount);
        if (!val || val <= 0) {
            alert("Please enter a valid amount");
            return;
        }
        onSubmit(val, desc);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6">
                <h3 className="font-bold text-lg mb-4">{title}</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input 
                        label="Amount" 
                        type="number" 
                        value={amount} 
                        onChange={e => setAmount(e.target.value)} 
                        autoFocus
                        required 
                    />
                    <Input 
                        label="Description (Optional)" 
                        value={desc} 
                        onChange={e => setDesc(e.target.value)} 
                        placeholder={type === 'CREDIT' ? 'Cash / UPI' : 'Goods / Adjustment'}
                    />
                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                        <Button type="submit" className={`flex-1 ${type === 'CREDIT' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white`}>
                            Confirm
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
