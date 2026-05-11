import React from 'react';
import { motion } from 'motion/react';

const EMOJIS = ['💸', '💰', '🪙', '📊', '💳', '💵', '🤑', '📉', '📈'];

export default function FluidBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Animated Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20"></div>

      {/* Floating Emojis */}
      <div className="absolute inset-0">
        {EMOJIS.map((emoji, i) => (
          <div
            key={i}
            className="absolute animate-float opacity-0 text-2xl"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: `-50px`,
              animationDelay: `${Math.random() * 20}s`,
              animationDuration: `${15 + Math.random() * 10}s`
            }}
          >
            {emoji}
          </div>
        ))}
      </div>
    </div>
  );
}
