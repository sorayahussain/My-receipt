import React from 'react';
import { Link } from 'react-router-dom';
import { Receipt, Scan, ShieldCheck, Zap, ArrowRight, Github } from 'lucide-react';
import { motion } from 'motion/react';

export default function Landing() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-20 px-4 md:px-6 flex flex-col items-center text-center max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-6 md:mb-8">
            <Zap className="w-3 h-3" /> Powered by Gemini 3 Flash
          </div>
          <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-6 leading-[1.1] px-2">
            Your Receipts in <br /><span className="text-blue-600">One Place. 💸</span>
          </h1>
          <p className="text-base md:text-xl text-gray-500 mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed px-4">
            Scan any receipt, extract data in seconds, and store it securely. 💰
            The smartest way to track your business and personal expenses. 📈
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-xs sm:max-w-none mx-auto px-4">
            <Link 
              to="/scanner" 
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2 group"
            >
              Try it out! <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              to="/auth" 
              className="w-full sm:w-auto px-8 py-4 bg-white text-gray-900 border border-gray-200 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all"
            >
              Log In
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="w-full py-16 md:py-20 bg-white rounded-[2.5rem] md:rounded-[3rem] shadow-sm border border-gray-50 px-6 md:px-8 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 max-w-6xl mb-20 text-center md:text-left">
        <div className="flex flex-col items-center md:items-start">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
            <Scan className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold mb-3">Instant OCR</h3>
          <p className="text-gray-500 text-sm md:text-base">World-class vision AI identifies merchants, dates, and amounts with incredible precision.</p>
        </div>
        <div className="flex flex-col items-center md:items-start">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold mb-3">Cloud Security</h3>
          <p className="text-gray-500 text-sm md:text-base">Your data is stored securely using Firebase. No one else can access your scanned receipts.</p>
        </div>
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-6 group-hover:scale-110 transition-transform">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold mb-3">Smart Extraction</h3>
          <p className="text-gray-500 text-sm md:text-base">Automatically detects local currencies and formats. No manual input required.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full max-w-6xl pb-20 pt-10 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-6 px-4">
        <div className="flex items-center gap-2">
          <Receipt className="w-6 h-6 text-blue-600" />
          <span className="font-bold text-xl">MyReceipt</span>
        </div>
        <div className="flex items-center gap-8 text-sm font-medium text-gray-500">
          <a href="#" className="hover:text-gray-900">Privacy</a>
          <a href="#" className="hover:text-gray-900">Terms</a>
          <a href="#" className="hover:text-gray-900 flex items-center gap-1">
            <Github className="w-4 h-4" /> Open Source
          </a>
        </div>
      </footer>
    </div>
  );
}
