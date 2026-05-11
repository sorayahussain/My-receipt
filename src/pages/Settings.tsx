
import React, { useState } from 'react';
import { 
  collection, 
  getDocs, 
  writeBatch, 
  doc, 
  deleteDoc,
  query
} from 'firebase/firestore';
import { 
  deleteUser, 
  reauthenticateWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { db, auth } from '../firebase';
import { 
  Settings as SettingsIcon, 
  Trash2, 
  UserX, 
  Download, 
  ShieldAlert,
  ChevronRight,
  LogOut,
  AlertTriangle,
  FileText,
  X,
  Loader2,
  LayoutList,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateHistoryPDF } from '../lib/pdf-utils';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showReauthNotice, setShowReauthNotice] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    startDate: '',
    endDate: '',
    category: 'All',
    type: 'summary' as 'summary' | 'detailed'
  });
  const navigate = useNavigate();

  const CATEGORIES = ['All', 'Dining', 'Groceries', 'Travel', 'Tech', 'Entertainment', 'Other'];

  const handleExportPDF = async () => {
    if (!auth.currentUser) return;
    setIsExporting(true);
    try {
      const receiptsRef = collection(db, 'users', auth.currentUser.uid, 'receipts');
      const snapshot = await getDocs(receiptsRef);
      let receipts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      if (receipts.length === 0) {
        alert('You have no receipts to export. Scan some receipts first!');
        setIsExporting(false);
        setShowExportModal(false);
        return;
      }

      // Filter by date range and category
      if (exportOptions.startDate) {
        receipts = receipts.filter(r => r.date >= exportOptions.startDate);
      }
      if (exportOptions.endDate) {
        receipts = receipts.filter(r => r.date <= exportOptions.endDate);
      }
      if (exportOptions.category !== 'All') {
        receipts = receipts.filter(r => r.category === exportOptions.category);
      }

      if (receipts.length === 0) {
        alert('No receipts found matching the selected filters.');
        return;
      }

      generateHistoryPDF(
        receipts, 
        auth.currentUser.displayName || auth.currentUser.email,
        { type: exportOptions.type }
      );
      setShowExportModal(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to generate PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearHistory = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const receiptsRef = collection(db, 'users', auth.currentUser.uid, 'receipts');
      const snapshot = await getDocs(receiptsRef);
      const batch = writeBatch(db);
      
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      setShowConfirmClear(false);
      alert('History cleared successfully!');
    } catch (error) {
      console.error('Error clearing history:', error);
      alert('Failed to clear history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const performAccountDeletion = async (user: any) => {
    // 1. Comprehensive Database Cleanup
    console.log("Cleaning up database for user:", user.uid);
    
    // Clear receipts subcollection
    const receiptsRef = collection(db, 'users', user.uid, 'receipts');
    const snapshot = await getDocs(receiptsRef);
    
    if (snapshot.size > 0) {
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
    
    // Delete user profile document
    await deleteDoc(doc(db, 'users', user.uid));
    
    // 2. Delete Authentication Account
    console.log("Deleting auth account...");
    await deleteUser(user);
    
    // 3. Success & Redirect
    console.log("Account successfully deleted");
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;
    const user = auth.currentUser;
    setLoading(true);
    
    try {
      await performAccountDeletion(user);
    } catch (error: any) {
      console.error('Account deletion failed:', error);
      
      // Specifically handle the re-authentication requirement
      if (error.code === 'auth/requires-recent-login') {
        setShowReauthNotice(true);
        setLoading(false);
      } else {
        alert(`Deletion failed: ${error.message || 'Unknown error'}. Please try again later.`);
        setLoading(false);
      }
    } finally {
      setShowConfirmDelete(false);
    }
  };

  const handleReauthAndRetry = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      // Force account selection to ensure they pick the SAME one
      provider.setCustomParameters({ prompt: 'select_account' });
      
      console.log("Starting re-authentication popup...");
      await reauthenticateWithPopup(auth.currentUser, provider);
      console.log("Re-authentication successful");
      
      setShowReauthNotice(false);
      
      // Immediately retry deletion with the fresh state
      await performAccountDeletion(auth.currentUser);
    } catch (error: any) {
      console.error('Re-authentication failed:', error);
      if (error.code === 'auth/user-mismatch') {
        alert('Account mismatch: You must sign in with the SAME Google account (' + auth.currentUser.email + ') to confirm deletion.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        // Do nothing
      } else {
        alert(`Security check failed: ${error.message}. Please try logging out and back in.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
                      <option key={cat} value={cat}>{cat}</option>
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
                  disabled={isExporting}
                  className="w-full py-4 bg-blue-600 text-white rounded-[1.5rem] font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Download Report
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600">
          <SettingsIcon className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Settings</h1>
          <p className="text-gray-500 font-medium">Manage your account and data.</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Profile Card */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 overflow-hidden shrink-0">
            {auth.currentUser?.photoURL ? (
              <img src={auth.currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 font-black text-xl">
                {auth.currentUser?.email?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-gray-900 text-lg truncate">
              {auth.currentUser?.displayName || 'Anonymous User'}
            </h2>
            <p className="text-gray-500 text-sm font-medium truncate">{auth.currentUser?.email}</p>
          </div>
          <button 
            onClick={() => auth.signOut()}
            className="p-3 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Action Groups */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={() => setShowExportModal(true)}
            disabled={loading}
            className="group p-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-100/50 hover:border-blue-100 transition-all text-left flex flex-col gap-4 active:scale-95"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-lg">Export Data</h3>
              <p className="text-gray-500 text-sm font-medium">Download your entire receipt history as a PDF report.</p>
            </div>
          </button>

          <button 
            onClick={() => setShowConfirmClear(true)}
            disabled={loading}
            className="group p-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-orange-100/50 hover:border-orange-100 transition-all text-left flex flex-col gap-4 active:scale-95"
          >
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-lg">Clear History</h3>
              <p className="text-gray-500 text-sm font-medium">Permanently delete all scanned receipts from our servers.</p>
            </div>
          </button>
        </div>

        {/* Danger Zone */}
        <div className="pt-8">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-2">Danger Zone</h2>
          <button 
            onClick={() => setShowConfirmDelete(true)}
            disabled={loading}
            className="w-full group p-6 bg-red-50/50 rounded-[2rem] border border-red-100 hover:bg-red-50 transition-all text-left flex items-center gap-4 active:scale-[0.99]"
          >
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm group-hover:scale-110 transition-transform">
              <UserX className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-red-700">Delete Account</h3>
              <p className="text-red-600/70 text-xs font-medium uppercase tracking-wider">This action is irreversible</p>
            </div>
            <ShieldAlert className="w-5 h-5 text-red-300 group-hover:text-red-500 transition-colors" />
          </button>
        </div>
      </div>

      {/* Confirmation Modals */}
      <AnimatePresence>
        {(showConfirmClear || showConfirmDelete || showReauthNotice) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { 
                if (!loading) {
                  setShowConfirmClear(false); 
                  setShowConfirmDelete(false); 
                  setShowReauthNotice(false); 
                }
              }}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            
            {showReauthNotice ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
              >
                <div className="text-center">
                  <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center text-blue-600 mx-auto mb-6 scale-110">
                    <RefreshCw className="w-10 h-10" />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Security Check</h2>
                  <p className="text-gray-500 mt-2 font-medium leading-relaxed">
                    Deleting your account is a sensitive action. For your protection, please re-authenticate to confirm it's really you.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 mt-8">
                  <button 
                    disabled={loading}
                    onClick={handleReauthAndRetry}
                    className="p-5 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />}
                    Confirm with Google
                  </button>
                  <button 
                    disabled={loading}
                    onClick={() => setShowReauthNotice(false)}
                    className="p-4 rounded-2xl font-bold text-gray-400 hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
              >
                <div className="text-center">
                  <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center text-red-500 mx-auto mb-6 scale-110 rotate-3">
                    <AlertTriangle className="w-10 h-10" />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Are you absolutely sure?</h2>
                  <p className="text-gray-500 mt-2 font-medium leading-relaxed">
                    {showConfirmClear 
                      ? "This will delete all your receipts. This action cannot be undone."
                      : "Your account and all associated data will be permanently removed."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8">
                  <button 
                    disabled={loading}
                    onClick={() => { setShowConfirmClear(false); setShowConfirmDelete(false); }}
                    className="p-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={loading}
                    onClick={showConfirmClear ? handleClearHistory : handleDeleteAccount}
                    className="p-4 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-100 hover:bg-red-700 transition-all flex items-center justify-center"
                  >
                    {loading ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                    ) : (
                      showConfirmClear ? 'Clear All' : 'Delete Now'
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
