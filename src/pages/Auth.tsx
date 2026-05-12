import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { LogIn, Rocket, ShieldCheck, Mail, Loader2, UserPlus, Key, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { handleFirestoreError, OperationType } from '../lib/firebase-utils';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocPath = `users/${user.uid}`;
      const userDocRef = doc(db, 'users', user.uid);
      let userDoc;
      try {
        userDoc = await getDoc(userDocRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, userDocPath);
      }

      if (userDoc && !userDoc.exists()) {
        try {
          await setDoc(userDocRef, {
            userId: user.uid,
            email: user.email,
            displayName: user.displayName,
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, userDocPath);
        }
      }

      navigate('/scanner');
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error.code === 'auth/unauthorized-domain') {
        setError(`Unauthorized Domain: ${window.location.hostname} needs to be added to Authorized Domains in Firebase Console.`);
      } else {
        setError("Google login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // Sign Up
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          setLoading(false);
          return;
        }

        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;

        // Set display name in auth profile
        if (displayName) {
          await updateProfile(user, { displayName });
        }

        // Create firestore doc
        const userDocPath = `users/${user.uid}`;
        try {
          await setDoc(doc(db, 'users', user.uid), {
            userId: user.uid,
            email: user.email,
            displayName: displayName || user.email?.split('@')[0],
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, userDocPath);
        }
      } else {
        // Log In
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/scanner');
    } catch (error: any) {
      console.error("Email auth failed:", error);
      if (error.code === 'auth/email-already-in-use') {
        setError("This email is already registered. Try logging in instead.");
      } else if (error.code === 'auth/invalid-credential') {
        setError("Invalid email or password. If you haven't created an account yet, please switch to Sign Up.");
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        setError("Invalid email or password.");
      } else if (error.code === 'auth/weak-password') {
        setError("Password should be at least 6 characters.");
      } else {
        setError(error.message || "Authentication failed. Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const hasPendingReceipt = !!sessionStorage.getItem('pending_receipt');

  return (
    <div className="max-w-md mx-auto py-6 md:py-12 px-4">
      {hasPendingReceipt && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3 text-blue-700 text-sm font-medium"
        >
          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0">
            <Rocket className="w-4 h-4" />
          </div>
          <div>
            Your scan is ready! Log in or sign up to save it to your history.
          </div>
        </motion.div>
      )}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 shadow-sm border border-gray-100"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-4 md:mb-6">
            <Rocket className="w-7 h-7 md:w-8 md:h-8" />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">
            {isSignUp ? 'Create Account 🚀' : 'Welcome Back 👋'}
          </h2>
          <p className="text-sm md:text-base text-gray-500 px-4">
            {isSignUp ? 'Join MyReceipt today and start saving. 💰' : 'Sign in to access your receipts. 💳'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-2xl flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4 mb-8">
          <AnimatePresence mode="wait">
            {isSignUp && (
              <motion.div 
                key="name-field"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1"
              >
                <label className="text-xs font-bold text-gray-400 uppercase ml-2">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-100 border rounded-2xl outline-none transition-all font-medium"
                  placeholder="John Doe"
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-2">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-100 border rounded-2xl outline-none transition-all font-medium"
              placeholder="name@company.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-400 uppercase ml-2">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-100 border rounded-2xl outline-none transition-all font-medium pr-12"
                placeholder="••••••••"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {isSignUp && (
              <motion.div 
                key="confirm-password-field"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1"
              >
                <label className="text-xs font-bold text-gray-400 uppercase ml-2">Confirm Password</label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-100 border rounded-2xl outline-none transition-all font-medium pr-12"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              isSignUp ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />
            )}
            {isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-4 text-gray-400 font-bold tracking-widest">Or continue with</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          type="button"
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 disabled:opacity-50 mb-8"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Google
        </button>

        <div className="text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            type="button"
            className="text-sm font-bold text-blue-600 hover:text-blue-700 underline underline-offset-4"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
          </button>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 py-6 border-t border-gray-50">
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" /> Secure Authentication
          </div>
          <p className="text-[10px] text-gray-400 font-mono">ENCRYPTED DATA • FIREBASE AUTH • PROTECTED</p>
        </div>
      </motion.div>
    </div>
  );
}
