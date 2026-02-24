import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Card, Button, Input, Badge } from '../components/ui';
import { formatCurrency } from '../utils';
import { Calendar, History, RefreshCw, Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DailyLedger() {
  const navigate = useNavigate();
  const { orders, expenses } = useStore();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [autoMode, setAutoMode] = useState(true);
  
  // Form State
  const [openingBalance, setOpeningBalance] = useState(0);
  const [grossSales, setGrossSales] = useState(0);
  const [onlineSales, setOnlineSales] = useState(0);
  const [creditSales, setCreditSales] = useState(0);
  const [todayExpenses, setTodayExpenses] = useState(0);
  const [actualCash, setActualCash] = useState(0);
  const [bankDeposit, setBankDeposit] = useState(0);

  // Auto-fetch logic
  const fetchDailyData = () => {
    const selectedDate = new Date(date);
    
    // Filter orders for the selected date
    const dayOrders = orders.filter(o => {
      const oDate = new Date(o.date);
      return oDate.toDateString() === selectedDate.toDateString() && o.status !== 'Cancelled';
    });

    const dayExpenses = expenses.filter(e => {
        const eDate = new Date(e.date);
        return eDate.toDateString() === selectedDate.toDateString();
    });

    const totalSales = dayOrders.reduce((sum, o) => sum + o.total, 0);
    const online = dayOrders.filter(o => o.paymentMode === 'UPI' || o.paymentMode === 'Card' || o.type === 'Online').reduce((sum, o) => sum + o.total, 0);
    const credit = dayOrders.filter(o => o.paymentMode === 'Credit').reduce((sum, o) => sum + o.total, 0);
    const expenseTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

    setGrossSales(totalSales);
    setOnlineSales(online);
    setCreditSales(credit);
    setTodayExpenses(expenseTotal);
  };

  useEffect(() => {
    if (autoMode) {
      fetchDailyData();
    }
  }, [date, autoMode, orders, expenses]);

  // Calculations
  // Expected Cash = Opening + (Gross - Online - Credit) - Expenses - BankDeposit
  // Note: Gross - Online - Credit = Cash Sales
  const cashSales = grossSales - onlineSales - creditSales;
  const expectedCash = openingBalance + cashSales - todayExpenses - bankDeposit;
  const difference = actualCash - expectedCash;
  const closingBalance = actualCash; // Usually actual cash in hand is the closing balance carried forward

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full">
                <ArrowLeft size={20} />
            </button>
            <div>
                <h2 className="text-xl font-bold text-gray-900">Daily Ledger</h2>
                <p className="text-xs text-gray-500">End-of-day cash reconciliation</p>
            </div>
        </div>
        <Button variant="outline" size="sm">
            <History size={16} className="mr-1" /> History
        </Button>
      </div>

      <Card className="p-4 space-y-4">
        {/* Date & Controls */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
            <div className="w-full sm:w-auto">
                <label className="text-xs text-gray-500 block mb-1">Date</label>
                <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-gray-300 w-full"
                />
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Auto Mode</span>
                    <button 
                        onClick={() => setAutoMode(!autoMode)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${autoMode ? 'bg-blue-600' : 'bg-gray-300'}`}
                    >
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${autoMode ? 'translate-x-5' : ''}`} />
                    </button>
                </div>
                <Button size="sm" variant="outline" onClick={fetchDailyData} disabled={!autoMode}>
                    <RefreshCw size={14} className="mr-1" /> Auto-Fetch
                </Button>
            </div>
        </div>

        {/* Opening Balance */}
        <div>
            <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Opening Balance</label>
                <button className="text-xs text-blue-600 flex items-center gap-1">
                    <History size={10} /> Auto (From Previous Day)
                </button>
            </div>
            <Input 
                type="number" 
                value={openingBalance} 
                onChange={e => setOpeningBalance(Number(e.target.value))} 
            />
            <p className="text-xs text-gray-400 mt-1">Auto-fetched from previous day's closing balance</p>
        </div>

        {/* Sales Breakdown */}
        <div className="space-y-3">
            <Input 
                label="Gross Sales" 
                type="number" 
                value={grossSales} 
                onChange={e => setGrossSales(Number(e.target.value))}
                disabled={autoMode}
            />
            <Input 
                label="Online Sales (UPI)" 
                type="number" 
                value={onlineSales} 
                onChange={e => setOnlineSales(Number(e.target.value))}
                disabled={autoMode}
            />
            <Input 
                label="Credit Sales" 
                type="number" 
                value={creditSales} 
                onChange={e => setCreditSales(Number(e.target.value))}
                disabled={autoMode}
            />
            <Input 
                label="Expenses" 
                type="number" 
                value={todayExpenses} 
                onChange={e => setTodayExpenses(Number(e.target.value))}
                disabled={autoMode}
            />
        </div>

        {/* Cash Reconciliation */}
        <div className="space-y-3 pt-4 border-t border-gray-100">
            <Input 
                label="Actual Cash (Counted)" 
                type="number" 
                value={actualCash} 
                onChange={e => setActualCash(Number(e.target.value))}
            />
            <Input 
                label="Bank Deposit" 
                type="number" 
                value={bankDeposit} 
                onChange={e => setBankDeposit(Number(e.target.value))}
            />
        </div>

        {/* Results */}
        <div className="bg-blue-50 p-4 rounded-xl space-y-3">
            <div>
                <p className="text-xs text-gray-500">Expected Cash</p>
                <p className="text-xl font-bold text-blue-700">{formatCurrency(expectedCash)}</p>
            </div>
            
            <div>
                <p className="text-xs text-gray-500">Difference</p>
                <p className={`text-xl font-bold ${difference === 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                </p>
            </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl">
            <p className="text-xs text-gray-500">Closing Balance (C/F)</p>
            <p className="text-2xl font-bold text-purple-700">{formatCurrency(closingBalance)}</p>
        </div>

        <Button className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 text-white">
            <Save size={20} className="mr-2" /> Save Daily Ledger
        </Button>

      </Card>
    </div>
  );
}
