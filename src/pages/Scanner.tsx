import React, { useState, useRef, useEffect } from 'react';
// Removed Gemini imports as it's now handled server-side
import { GoogleGenAI, Type } from '@google/genai';
import { 
  Upload, 
  Receipt, 
  Calendar, 
  DollarSign, 
  Building2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  X,
  Camera,
  Pencil,
  Zap,
  LogIn,
  Heart,
  History as HistoryIcon,
  Check,
  Scan
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

// --- Types ---

interface LineItem {
  name: string;
  quantity: number;
  price: number;
}

interface ReceiptData {
  merchantName: string;
  category: string;
  summary: string;
  date: string;
  totalAmount: number;
  currency: string;
  currencyConfidence: number;
  merchantAddress?: string;
  lineItems: LineItem[];
  extractionReasoning?: string;
}

enum AppState {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  EXTRACTING = 'EXTRACTING',
  CONFIRMING = 'CONFIRMING',
  REVIEWING = 'REVIEWING',
  SUBMITTED = 'SUBMITTED',
  ERROR = 'ERROR'
}

// --- Utilities ---

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  INR: '₹',
  CNY: '¥',
};

import { handleFirestoreError, OperationType } from '../lib/firebase-utils';

export default function Scanner() {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pendingBase64, setPendingBase64] = useState<string | null>(null);
  const [pendingMimeType, setPendingMimeType] = useState<string | null>(null);
  const [selectionSuccess, setSelectionSuccess] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAttemptingSave, setIsAttemptingSave] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData>({
    merchantName: '',
    date: '',
    totalAmount: 0,
    currency: 'USD',
    currencyConfidence: 1
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Load pending receipt if returning from Auth
  useEffect(() => {
    const pending = sessionStorage.getItem('pending_receipt');
    const pendingState = sessionStorage.getItem('pending_app_state');
    const pendingImage = sessionStorage.getItem('pending_image');
    
    if (pending && auth.currentUser) {
      try {
        setReceiptData(JSON.parse(pending));
        if (pendingState) setState(pendingState as AppState);
        if (pendingImage) setImagePreview(pendingImage);
        
        // Clean up
        sessionStorage.removeItem('pending_receipt');
        sessionStorage.removeItem('pending_app_state');
        sessionStorage.removeItem('pending_image');
        
        // If we were in REVIEWING state, we can just let the user click save again
        // or we can auto-save if we want. Let's let them click save to be safe.
      } catch (e) {
        console.error("Failed to restore pending receipt", e);
      }
    }
  }, [auth.currentUser]);

  // Gemini AI is now handled via the server-side proxy
  // const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const resetApp = () => {
    setState(AppState.IDLE);
    setIsEditing(false);
    setErrorMessage(null);
    setImagePreview(null);
    setPendingBase64(null);
    setPendingMimeType(null);
    setReceiptData({
      merchantName: '',
      category: 'Other',
      summary: '',
      date: '',
      totalAmount: 0,
      currency: 'USD',
      currencyConfidence: 1,
      lineItems: []
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setState(AppState.ERROR);
      setErrorMessage('Unrecognized Format: Please upload an image file (PNG, JPG, HEIC, etc.)');
      return;
    }

    processFile(file);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target?.result as string;
      setImagePreview(base64Data);
      setPendingBase64(base64Data.split(',')[1]);
      setPendingMimeType(file.type);
      
      // Success feedback
      setSelectionSuccess(true);
      setTimeout(() => {
        setSelectionSuccess(false);
        setState(AppState.CONFIRMING);
      }, 700);
    };
    reader.onerror = () => {
      setState(AppState.ERROR);
      setErrorMessage('Load Failed: Could not read the image file. Ensure it is not corrupted and try again.');
    };
    reader.readAsDataURL(file);
  };

  const extractDataWithAI = async (base64Data: string, mimeType: string) => {
    setState(AppState.EXTRACTING);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey || apiKey.trim() === "" || apiKey === "YOUR_GEMINI_API_KEY") {
        throw new Error("missing");
      }

      const ai = new GoogleGenAI({ apiKey });
      const modelName = "gemini-1.5-flash-preview"; 
      
      console.log(`[AI] Extracting directly from frontend with ${modelName}`);
      
      const response = await ai.models.generateContent({
        model: modelName, 
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            { text: "Extract data from this receipt. Return ONLY JSON." }
          ]
        },
        config: {
          systemInstruction: "You are a professional receipt scanner. Extract: merchant name, category, date (YYYY-MM-DD), currency (ISO 4217), total amount, and line items. Use clues like symbols or addresses to resolve currency ambiguity. If unusable, return an error field.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              error: {
                type: Type.STRING,
                description: "If unusable, provide a reason. Otherwise, leave empty.",
              },
              merchantName: { type: Type.STRING },
              category: { type: Type.STRING },
              summary: { type: Type.STRING },
              merchantAddress: { type: Type.STRING },
              date: { type: Type.STRING },
              totalAmount: { type: Type.NUMBER },
              currency: { type: Type.STRING },
              currencyConfidence: { type: Type.NUMBER },
              extractionReasoning: { type: Type.STRING },
              lineItems: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    price: { type: Type.NUMBER }
                  },
                  required: ["name", "quantity", "price"]
                }
              }
            },
            required: ["merchantName", "category", "summary", "date", "totalAmount", "currency", "currencyConfidence", "extractionReasoning", "lineItems"],
          }
        }
      });

      if (!response.text) {
        throw new Error("NO_RESPONSE");
      }

      const parsedData = JSON.parse(response.text.trim());
      
      if (parsedData.error) {
        throw new Error(parsedData.error);
      }

      setReceiptData(parsedData as ReceiptData);
      setIsEditing(false);
      setState(AppState.REVIEWING);
    } catch (error: any) {
      console.error("AI Extraction failed:", error);
      setState(AppState.ERROR);
      
      let message = "We couldn't read the receipt. Please try again with a clearer photo.";
      
      const errorStr = (error.message || "").toLowerCase();
      
      if (error.message === "BLURRY") {
        message = "The photo is a bit blurry. Try taking it again in better lighting.";
      } else if (error.message === "NOT_A_RECEIPT") {
        message = "This doesn't look like a valid receipt. Please upload a clear photo of a store receipt.";
      } else if (error.message === "UNREADABLE") {
        message = "The text is too hard to read. Make sure the receipt is flat and well-lit.";
      } else if (error.message === "NO_RESPONSE") {
        message = "The server didn't return any data. This might be a temporary connection issue.";
      } else if (error.name === "SyntaxError") {
        message = "There was a problem processing the receipt data. Please try another photo.";
      } else if (errorStr.includes('api key') || errorStr.includes('api_key') || errorStr.includes('invalid_argument')) {
        message = "API Key Error: The Gemini AI service rejected the request. Please ensure GEMINI_API_KEY is correctly set in your Secrets.";
      } else if (error.message === "missing") {
        message = "Configuration Error: The Gemini API key is missing. Please add GEMINI_API_KEY to your Secrets menu.";
      }
      
      setErrorMessage(message);
    }
  };

  const handleUpdateField = (field: keyof ReceiptData, value: string | number) => {
    setReceiptData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddLineItem = () => {
    setReceiptData(prev => ({
      ...prev,
      lineItems: [...(prev.lineItems || []), { name: '', quantity: 1, price: 0 }]
    }));
  };

  const handleRemoveLineItem = (index: number) => {
    setReceiptData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setReceiptData(prev => {
      const newLineItems = [...prev.lineItems];
      newLineItems[index] = { ...newLineItems[index], [field]: value };
      return { ...prev, lineItems: newLineItems };
    });
  };

  // Automatically update total amount when line items change
  useEffect(() => {
    if (isEditing) {
      const newTotal = receiptData.lineItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      // Only update if the difference is more than a rounding error to avoid infinite loops
      if (Math.abs(newTotal - receiptData.totalAmount) > 0.001) {
        setReceiptData(prev => ({ ...prev, totalAmount: newTotal }));
      }
    }
  }, [receiptData.lineItems, isEditing]);

  // Listen for login if user was attempting a guest save
  useEffect(() => {
    if (auth.currentUser && isAttemptingSave) {
      handleSave();
      setIsAttemptingSave(false);
      setShowAuthModal(false);
    }
  }, [auth.currentUser, isAttemptingSave]);

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Popup Auth failed:", error);
      setErrorMessage("Authentication failed. Please try again.");
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!auth.currentUser) {
      setIsAttemptingSave(true);
      // Persist state to session storage in case they use redirect login
      sessionStorage.setItem('pending_receipt', JSON.stringify(receiptData));
      sessionStorage.setItem('pending_app_state', state);
      if (imagePreview) sessionStorage.setItem('pending_image', imagePreview);
      
      setShowAuthModal(true);
      return;
    }

    const receiptsPath = `users/${auth.currentUser.uid}/receipts`;
    const payload = {
      merchantName: receiptData.merchantName,
      category: receiptData.category,
      summary: receiptData.summary,
      date: receiptData.date,
      totalAmount: receiptData.totalAmount,
      currency: receiptData.currency,
      merchantAddress: receiptData.merchantAddress || '',
      lineItems: receiptData.lineItems,
      ownerId: auth.currentUser.uid,
      createdAt: serverTimestamp(),
    };

    try {
      setState(AppState.UPLOADING); 
      const userReceiptsRef = collection(db, 'users', auth.currentUser.uid, 'receipts');
      await addDoc(userReceiptsRef, payload);
      setState(AppState.SUBMITTED);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, receiptsPath, payload);
      setState(AppState.ERROR);
      setErrorMessage("Failed to save receipt to your account. Please try again later.");
    }
  };

  const handleConfirmExtraction = () => {
    if (pendingBase64 && pendingMimeType) {
      extractDataWithAI(pendingBase64, pendingMimeType);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-6 md:mb-12 flex flex-row items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2 md:gap-3">
            <Receipt className="w-5 h-5 md:w-8 md:h-8 text-blue-600" />
            Scanner 💰
          </h1>
          <p className="text-[10px] md:text-base text-gray-500 mt-0.5 md:mt-2">Scan it. Save it. Done. 💸</p>
        </div>
        {state !== AppState.IDLE && (
          <button 
            onClick={resetApp}
            className="text-xs md:text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1 self-end md:self-auto"
          >
            <X className="w-3 h-3 md:w-4 md:h-4" /> Reset
          </button>
        )}
      </header>

      <main>
        <AnimatePresence mode="wait">
          
          {/* AUTH MODAL FOR GUESTS */}
          <AnimatePresence>
            {showAuthModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowAuthModal(false)}
                  className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                  
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center text-blue-600 mx-auto mb-6 rotate-3">
                      <Heart className="w-10 h-10 fill-blue-600" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Save Your Receipt</h2>
                    <p className="text-gray-500 mt-2 font-medium leading-relaxed">
                      Log in to store this receipt forever and access it from any device.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <button 
                      onClick={handleGoogleSignIn}
                      className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 p-4 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-200 transition-all active:scale-[0.98] shadow-sm"
                    >
                      <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                      Continue with Google
                    </button>
                    
                    <button 
                      onClick={() => navigate('/auth')}
                      className="w-full flex items-center justify-center gap-3 bg-gray-100 p-4 rounded-2xl font-bold text-gray-600 hover:bg-gray-200 transition-all active:scale-[0.98]"
                    >
                      <LogIn className="w-5 h-5" />
                      Email & Password
                    </button>
                  </div>

                  <p className="text-center text-[10px] text-gray-400 mt-8 font-bold uppercase tracking-widest">
                    Secure Cloud Storage • Free Forever
                  </p>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* IDLE STATE: Upload / Capture */}
          {state === AppState.IDLE && (
            <motion.div 
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-6 px-1"
            >
              <div 
                onClick={() => !selectionSuccess && fileInputRef.current?.click()}
                className={`group relative cursor-pointer overflow-hidden rounded-[1.5rem] md:rounded-[2rem] bg-white border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-3 md:gap-6 h-[160px] md:h-[300px] ${
                  selectionSuccess ? 'border-emerald-500 bg-emerald-50 shadow-inner' : 'border-gray-200 hover:border-blue-400'
                }`}
              >
                <AnimatePresence mode="wait">
                  {selectionSuccess ? (
                    <motion.div 
                      key="success-upload"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-200">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <span className="text-emerald-700 font-black tracking-tight">FILE DETECTED ✨</span>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="idle-upload"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center gap-4 md:gap-6 text-center"
                    >
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                        <Upload className="w-6 h-6 md:w-8 md:h-8" />
                      </div>
                      <div>
                        <h3 className="text-base md:text-lg font-bold text-gray-900">Upload Photo</h3>
                        <p className="text-gray-400 text-xs md:text-sm mt-1">Select from your files</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <input 
                  type="file" 
                  className="hidden" 
                  ref={fileInputRef} 
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>

              <div 
                onClick={() => !selectionSuccess && cameraInputRef.current?.click()}
                className={`group relative cursor-pointer overflow-hidden rounded-[1.5rem] md:rounded-[2rem] bg-white border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-3 md:gap-6 h-[160px] md:h-[300px] ${
                  selectionSuccess ? 'border-emerald-500 bg-emerald-50 shadow-inner' : 'border-gray-200 hover:border-emerald-400'
                }`}
              >
                <AnimatePresence mode="wait">
                  {selectionSuccess ? (
                    <motion.div 
                      key="success-camera"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-200">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <span className="text-emerald-700 font-black tracking-tight">PHOTO TAKEN 📸</span>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="idle-camera"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center gap-4 md:gap-6 text-center"
                    >
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                        <Camera className="w-6 h-6 md:w-8 md:h-8" />
                      </div>
                      <div>
                        <h3 className="text-base md:text-lg font-bold text-gray-900">Take Photo</h3>
                        <p className="text-gray-400 text-xs md:text-sm mt-1">Use your camera directly</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <input 
                  type="file" 
                  capture="environment"
                  className="hidden" 
                  ref={cameraInputRef} 
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>
            </motion.div>
          )}

          {/* CONFIRMATION STATE */}
          {state === AppState.CONFIRMING && (
            <motion.div 
              key="confirming"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-xl mx-auto bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="text-center mb-6 md:mb-8">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-3 md:mb-4">
                  <CheckCircle2 className="w-7 h-7 md:w-8 md:h-8" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">Confirm Receipt</h2>
                <p className="text-sm md:text-base text-gray-500 mt-1 md:mt-2">Does this look clear enough?</p>
              </div>

              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100 mb-6 md:mb-8 border border-gray-200">
                <img 
                  src={imagePreview || ''} 
                  alt="Captured Receipt" 
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 pointer-events-none border-[8px] md:border-[12px] border-white/20 rounded-2xl"></div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <button 
                  onClick={resetApp}
                  className="px-4 md:px-6 py-3 md:py-4 bg-gray-100 text-gray-700 rounded-xl md:rounded-2xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2 text-sm md:text-base"
                >
                  <X className="w-4 h-4" /> Retake
                </button>
                <button 
                  onClick={handleConfirmExtraction}
                  className="px-4 md:px-6 py-3 md:py-4 bg-blue-600 text-white rounded-xl md:rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 text-sm md:text-base"
                >
                  <Zap className="w-4 h-4" /> Extract
                </button>
              </div>
            </motion.div>
          )}

          {/* PROCESSING STATE */}
          {(state === AppState.UPLOADING || state === AppState.EXTRACTING) && (
            <motion.div 
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100"
            >
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-25" />
                <div className="relative w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {state === AppState.UPLOADING ? 'Storing Data... 💾' : 'AI is reading... 🧠'}
              </h2>
              <p className="text-gray-500 max-w-sm text-center">
                Extracted data will be ready in just a few seconds. We're identifying the merchant, date, and totals. ✨
              </p>
            </motion.div>
          )}

          {/* REVIEW STATE */}
          {state === AppState.REVIEWING && (
            <motion.div 
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              {/* Preview Card */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 h-fit">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Captured Receipt</h3>
                  <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase bg-emerald-50 px-2 py-1 rounded">
                    <CheckCircle2 className="w-3 h-3" /> Scanned
                  </div>
                </div>
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100">
                  <img 
                    src={imagePreview || ''} 
                    alt="Receipt" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Details Section */}
              <div className="bg-white rounded-3xl p-4 md:p-8 shadow-sm border border-gray-100 flex flex-col">
                <div className="flex justify-between items-center mb-6 md:mb-8">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 px-1">
                    {isEditing ? 'Edit Details' : 'Review Details'}
                  </h3>
                </div>
                
                {isEditing ? (
                  <form onSubmit={handleSave} className="space-y-6 flex-1">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                        <Building2 className="w-3 h-3" /> Merchant
                      </label>
                      <input 
                        type="text" 
                        value={receiptData.merchantName}
                        onChange={(e) => handleUpdateField('merchantName', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-100 border rounded-xl outline-none transition-all font-medium"
                        placeholder="e.g. Starbucks"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                        <FileText className="w-3 h-3" /> Address
                      </label>
                      <input 
                        type="text" 
                        value={receiptData.merchantAddress || ''}
                        onChange={(e) => handleUpdateField('merchantAddress', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-100 border rounded-xl outline-none transition-all font-medium"
                        placeholder="Merchant Address"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] md:text-xs font-bold text-gray-500 uppercase flex items-center gap-1 md:gap-2">
                          <Calendar className="w-3 h-3" /> Date
                        </label>
                        <input 
                          type="date" 
                          value={receiptData.date}
                          onChange={(e) => handleUpdateField('date', e.target.value)}
                          className="w-full px-3 md:px-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-100 border rounded-xl outline-none transition-all font-medium text-xs md:text-base"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] md:text-xs font-bold text-gray-500 uppercase flex items-center gap-1 md:gap-2">
                          <DollarSign className="w-3 h-3" /> Total
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm md:text-lg">
                            {CURRENCY_SYMBOLS[receiptData.currency] || receiptData.currency}
                          </span>
                          <input 
                            type="number" 
                            step="0.01"
                            value={receiptData.totalAmount}
                            onChange={(e) => handleUpdateField('totalAmount', parseFloat(e.target.value))}
                            className="w-full pl-8 md:pl-12 pr-3 md:pr-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-100 border rounded-xl outline-none transition-all font-bold text-sm md:text-lg"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                         Currency
                      </label>
                      <select 
                        value={receiptData.currency}
                        onChange={(e) => handleUpdateField('currency', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-100 border rounded-xl outline-none transition-all font-medium"
                      >
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="JPY">JPY - Japanese Yen</option>
                        <option value="CAD">CAD - Canadian Dollar</option>
                        <option value="AUD">AUD - Australian Dollar</option>
                        <option value="INR">INR - Indian Rupee</option>
                        <option value="CNY">CNY - Chinese Yuan</option>
                      </select>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                          <FileText className="w-3 h-3" /> Line Items
                        </label>
                        <button 
                          type="button"
                          onClick={handleAddLineItem}
                          className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                        >
                          + Add Item
                        </button>
                      </div>
                      
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {receiptData.lineItems.map((item, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-3 relative group">
                            <button 
                              type="button"
                              onClick={() => handleRemoveLineItem(index)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-50 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-red-100 shadow-sm"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            
                            <input 
                              type="text"
                              placeholder="Item name"
                              value={item.name}
                              onChange={(e) => handleUpdateLineItem(index, 'name', e.target.value)}
                              className="w-full bg-transparent border-b border-gray-200 focus:border-blue-400 outline-none px-1 py-1 text-sm font-medium"
                            />
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Qty</span>
                                <input 
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateLineItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                  className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-100"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Price</span>
                                <div className="relative flex-1">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">
                                    {CURRENCY_SYMBOLS[receiptData.currency] || ''}
                                  </span>
                                  <input 
                                    type="number"
                                    step="0.01"
                                    value={item.price}
                                    onChange={(e) => handleUpdateLineItem(index, 'price', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-white border border-gray-200 rounded-lg pl-5 pr-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-100 font-bold"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-6 flex gap-3">
                      <button 
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="flex-[2] bg-[#1a1a1a] text-white py-4 rounded-2xl font-bold hover:bg-gray-800 active:scale-95 transition-all shadow-lg shadow-gray-200"
                      >
                        Confirm & Store
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-8 flex-1">
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Merchant</p>
                        <p className="text-lg font-bold text-gray-900">{receiptData.merchantName || 'Unknown Merchant'}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                            {receiptData.category}
                          </span>
                          {receiptData.summary && (
                            <span className="text-[10px] text-gray-500 font-medium italic truncate max-w-[200px]">
                              "{receiptData.summary}"
                            </span>
                          )}
                        </div>
                        {receiptData.merchantAddress && (
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> {receiptData.merchantAddress}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                      <div className="flex items-start gap-2 md:gap-4 p-3 md:p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                          <Calendar className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 md:mb-1">Date</p>
                          <p className="text-xs md:text-sm font-bold text-gray-900">{receiptData.date || 'No Date'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2 md:gap-4 p-3 md:p-4 bg-gray-50 rounded-2xl border border-gray-100 relative group">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                          <DollarSign className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-0.5 md:mb-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amount</p>
                            {receiptData.currencyConfidence < 0.8 && (
                              <div className="group relative">
                                <AlertCircle className="w-3 h-3 text-amber-500 cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 p-2 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                                  Low confidence in currency detection. Please verify.
                                </div>
                              </div>
                            )}
                          </div>
                          <p className="text-sm md:text-lg font-bold text-gray-900 truncate max-w-[80px] xs:max-w-none">
                            {CURRENCY_SYMBOLS[receiptData.currency] || ''} {receiptData.totalAmount.toFixed(2)}
                            <span className="ml-1 text-[8px] md:text-[10px] text-gray-400">{receiptData.currency}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Reasoning Alert */}
                    {receiptData.extractionReasoning && (
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex gap-3 items-start">
                        <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">AI Reasoning</p>
                          <p className="text-xs text-gray-600 leading-tight mt-1">{receiptData.extractionReasoning}</p>
                        </div>
                      </div>
                    )}

                    {/* Details Section */}
                    {receiptData.lineItems && receiptData.lineItems.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Itemized Breakdown</p>
                        <div className="bg-gray-50 rounded-2xl border border-gray-100 divide-y divide-gray-200/50 overflow-hidden">
                          {receiptData.lineItems.map((item, i) => (
                            <div key={i} className="px-3 md:px-4 py-2 md:py-3 flex justify-between items-center text-sm">
                              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                                <span className="w-5 h-5 rounded bg-white border border-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400 shrink-0">
                                  {item.quantity}x
                                </span>
                                <span className="font-medium text-gray-700 truncate">{item.name}</span>
                              </div>
                              <span className="font-bold text-gray-900 whitespace-nowrap ml-2">
                                {CURRENCY_SYMBOLS[receiptData.currency] || ''} {item.price.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-10 mt-auto flex flex-col gap-3">
                      <button 
                        onClick={() => handleSave()}
                        className="w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-bold hover:bg-gray-800 active:scale-95 transition-all shadow-lg shadow-gray-200 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-5 h-5" /> Confirm & Save
                      </button>
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="w-full bg-white border border-gray-200 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <Pencil className="w-4 h-4" /> Edit Details
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ERROR STATE */}
          {state === AppState.ERROR && (
            <motion.div 
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-xl mx-auto w-full bg-white rounded-[2rem] overflow-hidden shadow-2xl shadow-red-100 border border-red-50"
            >
              <div className="p-1 dark:bg-red-500 bg-red-500"></div>
              <div className="p-8 md:p-10 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-8 rotate-3 transition-transform hover:rotate-0">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">Process Interrupted</h2>
                <div className="bg-red-50/50 rounded-2xl p-6 border border-red-100/50 mb-8 w-full">
                  <p className="text-gray-700 font-medium leading-relaxed">
                    {errorMessage || "An unexpected error occurred while processing the receipt."}
                  </p>
                </div>
                
                <div className="w-full flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={resetApp}
                    className="flex-1 px-8 py-4 bg-gray-900 text-white rounded-2xl font-black hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200 flex items-center justify-center gap-2"
                  >
                    <Zap className="w-5 h-5 text-amber-400" /> Start Fresh
                  </button>
                  <button 
                    onClick={() => {
                      if (imagePreview) setState(AppState.CONFIRMING);
                      else resetApp();
                    }}
                    className="flex-1 px-8 py-4 bg-white border-2 border-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" /> Cancel
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-6 font-medium italic">
                  Pro tip: Ensure the receipt is well-lit and flat for best results.
                </p>
              </div>
            </motion.div>
          )}

          {/* SUBMITTED STATE */}
          {state === AppState.SUBMITTED && (
            <motion.div 
              key="submitted"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="max-w-md mx-auto text-center py-12 px-6"
            >
              <div className="relative inline-block mb-8">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                  className="w-24 h-24 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center text-white shadow-xl shadow-emerald-100 rotate-12"
                >
                  <Check className="w-12 h-12" />
                </motion.div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-lg animate-bounce">
                  <Zap className="w-4 h-4 fill-emerald-500" />
                </div>
              </div>
              
              <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-3">Receipt Saved!</h2>
              <p className="text-gray-500 font-medium mb-10 leading-relaxed">
                Your receipt from <span className="text-gray-900 font-bold">{receiptData.merchantName}</span> has been securely stored in your history.
              </p>

              <div className="flex flex-col gap-4">
                <button 
                  onClick={resetApp}
                  className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <Scan className="w-6 h-6" />
                  Scan Another Receipt
                </button>
                
                <button 
                  onClick={() => navigate('/history')}
                  className="w-full py-5 bg-white border-2 border-gray-100 text-gray-700 rounded-[2rem] font-black hover:border-gray-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  <HistoryIcon className="w-6 h-6" />
                  View in History
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
