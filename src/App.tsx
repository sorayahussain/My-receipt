/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';

import Navbar from './components/Navbar';
import FluidBackground from './components/FluidBackground';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Scanner from './pages/Scanner';
import History from './pages/History';
import Settings from './pages/Settings';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <FluidBackground />
        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen text-[#1a1a1a] font-sans selection:bg-blue-100 pb-20 relative isolate">
        <FluidBackground />
        <Navbar />
        <main className="px-4 md:px-8 relative z-10">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={user ? <Navigate to="/scanner" /> : <Auth />} />
            <Route 
              path="/scanner" 
              element={<Scanner />} 
            />
            <Route 
              path="/history" 
              element={user ? <History /> : <Navigate to="/auth" />} 
            />
            <Route 
              path="/settings" 
              element={user ? <Settings /> : <Navigate to="/auth" />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
