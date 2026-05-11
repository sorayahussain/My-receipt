import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  doc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { 
  Receipt as ReceiptIcon, 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  Tag, 
  ChevronRight,
  TrendingUp,
  Utensils,
  ShoppingBag,
  Bus,
  Zap,
  Gamepad2,
  MoreHorizontal,
  Download,
  X,
  Loader2,
  FileText,
  LayoutList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { generateHistoryPDF } from '../lib/pdf-utils';

interface LineItem {
  name: string;
  quantity: number;
  price: number;
}

interface Receipt {
  id: string;
  merchantName: string;
  category: string;
  summary: string;
  date: string;
  totalAmount: number;
  currency: string;
  createdAt: any;
  lineItems?: LineItem[];
}

const CATEGORIES = [
  { id: 'All', icon: <ReceiptIcon className="w-4 h-4" />, color: 'bg-gray-100 text-gray-600' },
  { id: 'Dining', icon: <Utensils className="w-4 h-4" />, color: 'bg-orange-100 text-orange-600' },
  { id: 'Groceries', icon: <ShoppingBag className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-600' },
  { id: 'Travel', icon: <Bus className="w-4 h-4" />, color: 'bg-blue-100 text-blue-600' },
  { id: 'Tech', icon: <Zap className="w-4 h-4" />, color: 'bg-purple-100 text-purple-600' },
  { id: 'Entertainment', icon: <Gamepad2 className="w-4 h-4" />, color: 'bg-pink-100 text-pink-600' },
  { id: 'Other', icon: <MoreHorizontal className="w-4 h-4" />, color: 'bg-slate-100 text-slate-600' },
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  INR: '₹',
  CNY: '¥',
  CHF: 'Fr'
};

export default function History() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [totalSpent, setTotalSpent] = useState(0);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    startDate: '',
    endDate: '',
    category: 'All',
    type: 'summary' as 'summary' | 'detailed'
  });

  const handleExportPDF = async () => {
    if (receipts.length === 0) {
      alert('You have no receipts to export. Scan some receipts first!');
      return;
    }

    setIsExporting(true);
    try {
      // Filter by date range and category
      let exportReceipts = [...receipts];
      
      if (exportOptions.startDate) {
        exportReceipts = exportReceipts.filter(r => r.date >= exportOptions.startDate);
      }
      if (exportOptions.endDate) {
        exportReceipts = exportReceipts.filter(r => r.date <= exportOptions.endDate);
      }
      if (exportOptions.category !== 'All') {
        exportReceipts = exportReceipts.filter(r => r.category === exportOptions.category);
      }

      // Sort by date ascending for the report
      exportReceipts.sort((a, b) => a.date.localeCompare(b.date));

      if (exportReceipts.length === 0) {
        alert('No receipts found matching the selected filters.');
        setIsExporting(false);
        return;
      }

      await generateHistoryPDF(
        exportReceipts, 
        auth.currentUser?.displayName || auth.currentUser?.email || 'User',
        { type: exportOptions.type }
      );
      
      // Keep loading for a moment for better UX
      setTimeout(() => {
        setIsExporting(false);
        setShowExportModal(false);
      }, 500);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to generate PDF. Please try again.');
      setIsExporting(false);
    }
  };

  const getExportSummary = () => {
    let filtered = [...receipts];
    if (exportOptions.startDate) filtered = filtered.filter(r => r.date >= exportOptions.startDate);
    if (exportOptions.endDate) filtered = filtered.filter(r => r.date <= exportOptions.endDate);
    if (exportOptions.category !== 'All') filtered = filtered.filter(r => r.category === exportOptions.category);
    
    const count = filtered.length;
    const total = filtered.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
    return { count, total };
  };

  const { count: exportCount, total: exportTotal } = getExportSummary();

  useEffect(() => {
    if (!auth.currentUser) return;

    const receiptsRef = collection(db, 'users', auth.currentUser.uid, 'receipts');
    const q = query(receiptsRef, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedReceipts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Receipt[];
      
      setReceipts(fetchedReceipts);
      setLoading(false);
      
      // Calculate total (simplified to USD for summary if multiple currencies exist)
      const total = fetchedReceipts.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
      setTotalSpent(total);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${auth.currentUser?.uid}/receipts`);
    });

    return () => unsubscribe();
  }, []);

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = receipt.merchantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         receipt.summary?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || receipt.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full"
        />
        <p className="mt-4 text-gray-500 font-medium animate-pulse">Loading history...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Export Modal */}
      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isExporting && setShowExportModal(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Export PDF Report</h3>
                <button 
                  disabled={isExporting}
                  onClick={() => setShowExportModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">From</label>
                    <input 
                      type="date" 
                      value={exportOptions.startDate}
                      onChange={(e) => setExportOptions({...exportOptions, startDate: e.target.value})}
                      className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 font-bold text-gray-700 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">To</label>
                    <input 
                      type="date" 
                      value={exportOptions.endDate}
                      onChange={(e) => setExportOptions({...exportOptions, endDate: e.target.value})}
                      className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 font-bold text-gray-700 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>
                </div>

                {/* Category Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Filter by Category</label>
                  <select 
                    value={exportOptions.category}
                    onChange={(e) => setExportOptions({...exportOptions, category: e.target.value})}
                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-100 font-bold text-gray-700 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.id}</option>
                    ))}
                  </select>
                </div>

                {/* Report Type */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Report Format</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setExportOptions({...exportOptions, type: 'summary'})}
                      className={`p-4 rounded-2xl border-2 flex flex-col gap-2 transition-all ${
                        exportOptions.type === 'summary' 
                          ? 'border-blue-600 bg-blue-50/50' 
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <LayoutList className={`w-5 h-5 ${exportOptions.type === 'summary' ? 'text-blue-600' : 'text-gray-400'}`} />
                      <div className="text-left">
                        <p className={`font-black text-sm ${exportOptions.type === 'summary' ? 'text-gray-900' : 'text-gray-500'}`}>Summary</p>
                        <p className="text-[10px] text-gray-400 font-medium">Key info only</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => setExportOptions({...exportOptions, type: 'detailed'})}
                      className={`p-4 rounded-2xl border-2 flex flex-col gap-2 transition-all ${
                        exportOptions.type === 'detailed' 
                          ? 'border-blue-600 bg-blue-50/50' 
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <FileText className={`w-5 h-5 ${exportOptions.type === 'detailed' ? 'text-blue-600' : 'text-gray-400'}`} />
                      <div className="text-left">
                        <p className={`font-black text-sm ${exportOptions.type === 'detailed' ? 'text-gray-900' : 'text-gray-500'}`}>Detailed</p>
                        <p className="text-[10px] text-gray-400 font-medium">Includes items</p>
                      </div>
                    </button>
                  </div>
                </div>

                <button 
                  onClick={handleExportPDF}
                  disabled={isExporting || exportCount === 0}
                  className="w-full py-4 bg-blue-600 text-white rounded-[1.5rem] font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale flex flex-col items-center justify-center gap-1"
                >
                  {isExporting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Generating Report...</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Download className="w-5 h-5" />
                        <span>Download Report</span>
                      </div>
                      {exportCount > 0 && (
                        <span className="text-[10px] opacity-70 font-bold uppercase tracking-widest">
                          {exportCount} items • ${exportTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 px-1">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2 md:gap-3">
            <ReceiptIcon className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
            History
          </h1>
          <p className="text-xs md:text-base text-gray-500 mt-1 md:mt-2 font-medium">Your digital receipt archive. 🏛️</p>
        </div>
        
        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex-1 bg-white p-3 md:p-4 rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 rounded-xl md:rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</p>
              <p className="text-lg md:text-2xl font-black text-gray-900 leading-tight">
                ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <button 
            onClick={() => setShowExportModal(true)}
            className="bg-white p-3 md:p-4 rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm flex items-center gap-2 md:gap-3 hover:bg-gray-50 transition-all font-bold text-gray-700 active:scale-95"
          >
            <div className="w-10 h-10 md:w-10 md:h-10 bg-blue-50 rounded-xl md:rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <span className="hidden sm:inline">Export PDF</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-2 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text"
            placeholder="Search merchants or items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-transparent rounded-2xl outline-none text-gray-900 font-medium placeholder:text-gray-400"
          />
        </div>
        
        <div className="flex overflow-x-auto pb-2 md:pb-0 gap-2 px-2 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all active:scale-95 ${
                selectedCategory === cat.id 
                  ? 'bg-gray-900 text-white shadow-lg shadow-gray-200' 
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {cat.icon}
              {cat.id}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filteredReceipts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredReceipts.map((receipt, index) => (
              <motion.div
                layout
                key={receipt.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedReceiptId(selectedReceiptId === receipt.id ? null : receipt.id)}
                className={`group bg-white rounded-[2.5rem] p-6 border transition-all duration-300 relative overflow-hidden flex flex-col cursor-pointer ${
                  selectedReceiptId === receipt.id 
                    ? 'border-blue-500 shadow-2xl shadow-blue-100 ring-4 ring-blue-50/50' 
                    : 'border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 hover:border-b-blue-100 border-b-4 border-b-gray-50'
                }`}
              >
                {/* Category Badge */}
                <div className={`absolute top-6 right-6 px-3 py-1.5 rounded-full font-black text-[10px] uppercase tracking-tighter ${
                  CATEGORIES.find(c => c.id === receipt.category)?.color || 'bg-gray-100 text-gray-600'
                }`}>
                  {receipt.category}
                </div>

                <div className="flex items-start gap-4 mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                    selectedReceiptId === receipt.id ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500'
                  }`}>
                    {CATEGORIES.find(c => c.id === receipt.category)?.icon || <ReceiptIcon />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-gray-900 truncate pr-16">{receipt.merchantName}</h3>
                    <div className="flex items-center gap-1.5 text-gray-400 text-sm font-medium mt-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(receipt.date).toLocaleDateString(undefined, { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 flex-1">
                  {receipt.summary && (
                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 italic font-medium">
                      "{receipt.summary}"
                    </p>
                  )}
                  
                  <AnimatePresence>
                    {selectedReceiptId === receipt.id && receipt.lineItems && receipt.lineItems.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-gray-100 pt-4 mt-4 space-y-2"
                      >
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Line Items</h4>
                        {receipt.lineItems.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs font-bold text-gray-600 bg-gray-50/50 p-2 rounded-lg">
                            <span className="flex-1 truncate pr-2">{item.quantity}x {item.name}</span>
                            <span className="text-gray-900">
                              {CURRENCY_SYMBOLS[receipt.currency] || ''}{item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center justify-between pt-4 mt-auto border-t border-gray-50">
                    <div className="flex items-center gap-1 text-gray-400">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold uppercase tracking-widest">Total</span>
                    </div>
                    <div className="text-xl font-black text-gray-900 flex items-baseline">
                      <span className="text-sm font-bold opacity-50 mr-0.5">
                        {CURRENCY_SYMBOLS[receipt.currency] || receipt.currency}
                      </span>
                      {receipt.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest transition-colors">
                    {selectedReceiptId === receipt.id ? 'Close Details' : 'View Details'}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all transform ${
                    selectedReceiptId === receipt.id ? 'bg-blue-600 text-white rotate-90' : 'bg-gray-50 text-gray-400 group-hover:bg-blue-600 group-hover:text-white group-hover:translate-x-1'
                  }`}>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-dashed border-gray-200"
        >
          <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center text-gray-300 mb-6">
            <Search className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">No receipts found</h2>
          <p className="text-gray-400 mt-2 mb-8">Try adjusting your filters or scan something new!</p>
          <button 
            onClick={() => window.location.href = '/scanner'}
            className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
          >
            <Zap className="w-5 h-5" /> Start Scanning
          </button>
        </motion.div>
      )}
    </div>
  );
}
