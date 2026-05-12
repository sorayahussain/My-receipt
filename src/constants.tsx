import React from 'react';
import { 
  Utensils, 
  ShoppingBag, 
  Bus, 
  Zap, 
  Gamepad2, 
  MoreHorizontal,
  Receipt
} from 'lucide-react';

export const CATEGORIES = [
  { id: 'Dining', icon: <Utensils className="w-5 h-5" />, color: 'bg-orange-100 text-orange-600', border: 'border-orange-100' },
  { id: 'Groceries', icon: <ShoppingBag className="w-5 h-5" />, color: 'bg-emerald-100 text-emerald-600', border: 'border-emerald-100' },
  { id: 'Travel', icon: <Bus className="w-5 h-5" />, color: 'bg-blue-100 text-blue-600', border: 'border-blue-100' },
  { id: 'Tech', icon: <Zap className="w-5 h-5" />, color: 'bg-purple-100 text-purple-600', border: 'border-purple-100' },
  { id: 'Entertainment', icon: <Gamepad2 className="w-5 h-5" />, color: 'bg-pink-100 text-pink-600', border: 'border-pink-100' },
  { id: 'Other', icon: <MoreHorizontal className="w-5 h-5" />, color: 'bg-slate-100 text-slate-600', border: 'border-slate-100' },
];

export const ALL_CATEGORIES = [
  { id: 'All', icon: <Receipt className="w-4 h-4" />, color: 'bg-gray-100 text-gray-600' },
  ...CATEGORIES
];

export const CURRENCY_SYMBOLS: Record<string, string> = {
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
