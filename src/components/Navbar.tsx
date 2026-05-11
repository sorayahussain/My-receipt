import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { Receipt, LogOut, User, Scan, Settings } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  return (
    <nav className="w-full flex items-center justify-between py-4 md:py-6 px-4 md:px-8 max-w-7xl mx-auto mb-4 md:mb-8 bg-white/50 backdrop-blur-sm sticky top-0 z-50 rounded-b-3xl">
      <Link to="/" className="flex items-center gap-2 group">
        <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-lg md:rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:scale-105 transition-transform">
          <Receipt className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <span className="font-bold text-lg md:text-xl tracking-tight text-gray-900">MyReceipt</span>
      </Link>

      <div className="flex items-center gap-2 md:gap-4">
        {user ? (
          <>
            <Link 
              to="/scanner" 
              className="p-2 md:px-4 md:py-2 text-sm font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-2"
            >
              <Scan className="w-5 h-5 md:w-4 md:h-4" /> 
              <span className="hidden md:inline">Scan</span>
            </Link>
            <Link 
              to="/history" 
              className="p-2 md:px-4 md:py-2 text-sm font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-2"
            >
              <Receipt className="w-5 h-5 md:w-4 md:h-4" /> 
              <span className="hidden md:inline">History</span>
            </Link>
            <Link 
              to="/settings" 
              className="p-2 md:px-4 md:py-2 text-sm font-bold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors flex items-center gap-2"
            >
              <Settings className="w-5 h-5 md:w-4 md:h-4" /> 
              <span className="hidden md:inline">Settings</span>
            </Link>
            <div className="flex items-center gap-1 md:gap-2 bg-white p-1 pr-2 md:pr-4 rounded-full border border-gray-100 shadow-sm">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-200 overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-600">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
              <span className="text-xs font-bold text-gray-700 hidden sm:inline">{user.displayName?.split(' ')[0]}</span>
              <button 
                onClick={handleLogout}
                className="ml-2 text-gray-400 hover:text-red-500 transition-colors p-1"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <Link 
            to="/auth" 
            className="px-6 py-2 bg-[#1a1a1a] text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200"
          >
            Log In
          </Link>
        )}
      </div>
    </nav>
  );
}
